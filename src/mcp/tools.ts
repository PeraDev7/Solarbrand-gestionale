import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db, randomUUID, parseJsonField } from '../lib/database.js';
import {
  buildSearchStrings,
  buildLocationQuery,
  buildActorInput,
  startApifyRun,
  parseGoogleMapsItems
} from '../lib/google-maps-scraper.js';
import { createJob, getJob, updateJob } from '../lib/scraper-jobs.js';
import { syncAppointmentToVendorCalendar, deleteVendorCalendarEvent } from '../lib/calendar.js';
import { McpUser } from './types.js';

export function registerMcpTools(server: McpServer, user: McpUser): void {
  const isAdmin = user.role === 'admin';
  const isTelefonista = user.role === 'telefonista';
  const isVenditore = user.role === 'venditore';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. WHOAMI
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('whoami', {
    description: 'Restituisce l\'identità, il ruolo (admin, telefonista, venditore) e i permessi dell\'account attualmente autenticato.',
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            services: user.services,
          },
          permissions: {
            canImportApify: isAdmin,
            canAssignTelefonisti: isAdmin,
            canAssignVenditori: isAdmin || isTelefonista,
            canCreateLead: isAdmin || isTelefonista,
            canDeleteAppointments: isAdmin || isTelefonista,
            leadVisibility: isAdmin
              ? 'Tutti i lead aziendali'
              : (isTelefonista ? 'Solo i propri lead assegnati e le proprie tipologie' : 'Solo i lead con appuntamenti o assegnati a sé'),
          },
          summary: `Sei autenticato come ${user.name} con ruolo '${user.role}'. ${
            isAdmin
              ? 'Hai accesso completo: puoi importare lead con Apify, gestire team, assegnare telefonisti ed agenti.'
              : isTelefonista
              ? 'Sei un operatore telefonico: puoi lavorare i tuoi lead assegnati, qualificarli e fissare appuntamenti assegnandoli agli agenti commerciali.'
              : 'Sei un agente commerciale (venditore): puoi consultare i tuoi sopralluoghi ed appuntamenti assegnati ed aggiornare le schede visita.'
          }`
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. START APIFY LEAD SEARCH (SOLO ADMIN)
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('start_apify_lead_search', {
    description: '[SOLO ADMIN] Avvia la ricerca ed estrazione massiva di nuovi lead da Google Maps tramite Apify (con email, telefono, sito web e verifica duplicati). Restituisce un runId da verificare con check_apify_lead_search.',
    inputSchema: z.object({
      industries: z.string().describe("Settori o categorie di attività da cercare separati da virgola (es: 'installatori fotovoltaico, carpenterie metalliche, aziende agricole, cantine')"),
      locations: z.string().optional().describe("Province o regioni separate da virgola (es: 'Verona, Vicenza, Padova, Veneto')"),
      cities: z.string().optional().describe("Città specifiche separate da virgola (es: 'Legnago, San Bonifacio, Villafranca')"),
      keywords: z.string().optional().describe("Parole chiave opzionali aggiuntive"),
      fetch_count: z.number().optional().default(20).describe("Numero esatto di contatti target completi da raccogliere (default 20, max 1000)"),
      assignedColleague: z.string().optional().describe("Nome esatto dell'agente commerciale a cui pre-assegnare i lead importati (opzionale)"),
      assignedTelefonista: z.string().optional().describe("Nome del telefonista a cui pre-assegnare i lead importati (opzionale)"),
      service: z.string().optional().describe("Tipologia da associare ai lead (es: 'Fotovoltaico Residenziale', 'Fotovoltaico Industriale', 'Agricolo')"),
      duplicateMode: z.enum(['skip', 'use_existing', 'create_new']).optional().default('skip').describe("Gestione duplicati: 'skip' salta i contatti già esistenti, 'use_existing' li aggiorna, 'create_new' li crea sempre"),
      wantsVerifiedEmail: z.boolean().optional().default(true).describe("Verifica e arricchimento email attivo (default true)"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  }, async (args) => {
    if (!isAdmin) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Operazione non consentita: l'estrazione lead da Apify è riservata esclusivamente agli amministratori. Il tuo profilo attuale è '${user.role}' (${user.name}).`
        }]
      };
    }

    const settingRow = await db.get(
      "SELECT value FROM settings WHERE `key` IN ('apify_token', 'apify_api_key') ORDER BY CASE `key` WHEN 'apify_token' THEN 0 ELSE 1 END LIMIT 1"
    ) as any;
    const apifyToken = (settingRow?.value || process.env.APIFY_TOKEN || process.env.APIFY_API_KEY || '').trim();

    if (!apifyToken) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: 'Token API Apify non configurato nel gestionale. Salvalo prima nelle impostazioni del CRM o nel file .env (APIFY_TOKEN).'
        }]
      };
    }

    const searchStrings = buildSearchStrings(args.industries, args.keywords);
    if (searchStrings.length === 0) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Inserisci almeno un settore o categoria di attività valida.' }]
      };
    }

    const locationQuery = buildLocationQuery(args.locations || '', args.cities || '');
    const targetCount = Math.max(1, Math.min(Number(args.fetch_count) || 20, 1000));
    const initialBatchSize = Math.max(25, Math.ceil((targetCount * 3.5) / searchStrings.length));

    const actorInput = buildActorInput(searchStrings, locationQuery, initialBatchSize, Boolean(args.wantsVerifiedEmail));
    const started = await startApifyRun(apifyToken, actorInput);

    if ('error' in started) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Errore durante l'avvio dello scraper Apify: ${started.error}` }]
      };
    }

    const jobId = randomUUID();
    createJob(jobId, {
      jobId,
      tenantId: 'default',
      apifyToken,
      createdAt: Date.now(),
      targetCount,
      searchStrings,
      locationQuery,
      wantsVerifiedEmail: Boolean(args.wantsVerifiedEmail),
      currentApifyRunId: started.runId,
      currentBatchSize: initialBatchSize,
      roundsDone: 0,
      collectedLeads: [],
      assignedColleague: args.assignedColleague ? String(args.assignedColleague).trim() : '',
      assignedTelefonista: args.assignedTelefonista ? String(args.assignedTelefonista).trim() : '',
      customService: args.service ? String(args.service).trim() : '',
      duplicateMode: args.duplicateMode as any,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          runId: jobId,
          status: 'RUNNING',
          targetCount,
          searchStrings,
          locationQuery,
          message: `Scansione avviata su Google Maps per raccogliere ${targetCount} contatti arricchiti. Usa lo strumento 'check_apify_lead_search' passando runId: "${jobId}" per controllare l'avanzamento o scaricare i risultati finali.`
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CHECK APIFY LEAD SEARCH (SOLO ADMIN)
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('check_apify_lead_search', {
    description: '[SOLO ADMIN] Verifica lo stato di un job di scraping Apify avviato con start_apify_lead_search e, al completamento, salva automaticamente i lead nel database del gestionale.',
    inputSchema: z.object({
      runId: z.string().describe("Il runId univoco restituito da start_apify_lead_search"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  }, async (args) => {
    if (!isAdmin) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Operazione riservata agli amministratori. Il tuo profilo attuale è: '${user.role}'.`
        }]
      };
    }

    const job = getJob(args.runId);
    if (!job) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Job di ricerca non trovato o scaduto (runId: ${args.runId}).` }]
      };
    }

    if (job.result) {
      return {
        content: [{ type: 'text', text: JSON.stringify(job.result, null, 2) }]
      };
    }

    // Check Run Status on Apify
    const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${job.currentApifyRunId}?token=${encodeURIComponent(job.apifyToken)}`);
    if (!runRes.ok) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ status: 'RUNNING', message: 'In attesa di risposta dai server Apify...' }, null, 2)
        }]
      };
    }

    const runData = await runRes.json();
    const apifyStatus = runData?.data?.status;

    if (apifyStatus === 'READY' || apifyStatus === 'RUNNING') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'RUNNING',
            foundSoFar: job.collectedLeads.length,
            roundsDone: job.roundsDone,
            message: `Scansione Google Maps ed arricchimento in corso (${job.collectedLeads.length}/${job.targetCount} lead completi con Email e Telefono)...`
          }, null, 2)
        }]
      };
    }

    if (apifyStatus !== 'SUCCEEDED') {
      job.result = {
        status: 'FAILED',
        ok: false,
        error: `La scansione su Apify si è conclusa con stato: ${apifyStatus || 'SCONOSCIUTO'}`
      };
      return {
        isError: true,
        content: [{ type: 'text', text: JSON.stringify(job.result, null, 2) }]
      };
    }

    // Download dataset
    const datasetId = runData.data.defaultDatasetId;
    const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(job.apifyToken)}`);
    if (!itemsRes.ok) {
      job.result = { status: 'FAILED', ok: false, error: 'Impossibile scaricare i dati estratti da Apify' };
      return {
        isError: true,
        content: [{ type: 'text', text: JSON.stringify(job.result, null, 2) }]
      };
    }

    const rawItems = await itemsRes.json();
    const { leads } = parseGoogleMapsItems(rawItems);

    const existingKeys = new Set(job.collectedLeads.map(l => `${l.email.toLowerCase()}|${l.phone}|${l.company.toLowerCase()}`));
    for (const lead of leads) {
      const key = `${lead.email.toLowerCase()}|${lead.phone}|${lead.company.toLowerCase()}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        job.collectedLeads.push(lead);
      }
    }

    // Multi-round check
    if (job.collectedLeads.length < job.targetCount && job.roundsDone < 5) {
      const remaining = job.targetCount - job.collectedLeads.length;
      const newBatchSize = Math.max(Math.ceil(job.currentBatchSize * 1.5), Math.ceil((remaining * 4) / job.searchStrings.length));
      const actorInput = buildActorInput(job.searchStrings, job.locationQuery, newBatchSize, job.wantsVerifiedEmail);
      const newRun = await startApifyRun(job.apifyToken, actorInput);

      if (!('error' in newRun)) {
        updateJob(args.runId, {
          currentApifyRunId: newRun.runId,
          currentBatchSize: newBatchSize,
          roundsDone: job.roundsDone + 1,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'RUNNING',
              foundSoFar: job.collectedLeads.length,
              roundsDone: job.roundsDone + 1,
              message: `Trovati finora ${job.collectedLeads.length}/${job.targetCount} contatti completi. Ricerca automatica dei rimanenti ${remaining} in corso (Round ${job.roundsDone + 2})...`
            }, null, 2)
          }]
        };
      }
    }

    // Save final leads into DB
    const finalLeads = job.collectedLeads.slice(0, job.targetCount);
    const now = new Date().toISOString();
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const importedIds: string[] = [];
    const duplicateMode = job.duplicateMode || 'skip';

    for (let i = 0; i < finalLeads.length; i++) {
      const lead = finalLeads[i];
      const name = lead.full_name.trim() || lead.company.trim() || 'Lead Google Maps';
      const company = lead.company.trim() || name;
      const phone = lead.phone.trim();
      const email = lead.email.toLowerCase().trim();
      const role = lead.role.trim();
      const address = lead.address.trim();
      const website = lead.website.trim();
      const service = role || job.searchStrings[0] || 'Google Maps';
      const services = [service];
      const notes = [
        website ? `Sito web: ${website}` : '',
        role ? `Ruolo referente: ${role}` : '',
      ].filter(Boolean).join('\n');

      const conditions: string[] = [];
      const params: any[] = [];
      if (email) { conditions.push('LOWER(email) = ?'); params.push(email); }
      if (phone) { conditions.push("REPLACE(phone, ' ', '') LIKE ?"); params.push(`%${phone.replace(/\s/g, '').replace(/^\+39/, '')}%`); }

      let duplicate: any = null;
      if (conditions.length > 0) {
        duplicate = await db.get(`SELECT * FROM leads WHERE ${conditions.join(' OR ')} LIMIT 1`, params) as any;
      }

      if (duplicate && duplicateMode !== 'create_new') {
        if (duplicateMode === 'skip') {
          skippedCount++;
          continue;
        }
        if (duplicateMode === 'use_existing') {
          try {
            const existingTel = parseJsonField(duplicate.assignedTelefonisti) || [];
            const newTelefonisti = job.assignedTelefonista ? [job.assignedTelefonista] : existingTel;
            const newColleague = job.assignedColleague || duplicate.assignedColleague || '';
            const existingServices = parseJsonField(duplicate.services) || (duplicate.service ? [duplicate.service] : []);
            const newServices = job.customService ? [job.customService] : (existingServices.length > 0 ? existingServices : services);
            const newService = job.customService || duplicate.service || (newServices[0] || service);

            await db.run(`
              UPDATE leads 
              SET name=?, company=?, phone=?, email=?, service=?, services=?, assignedColleague=?, assignedTelefonisti=?, status=?, address=?, updatedAt=?
              WHERE id=?
            `, [
              name || duplicate.name, company || duplicate.company, phone || duplicate.phone, email || duplicate.email,
              newService, JSON.stringify(newServices), newColleague, JSON.stringify(newTelefonisti),
              'Nuovo', address || duplicate.address, now, duplicate.id
            ]);
            updatedCount++;
            if (email) importedIds.push(duplicate.id);
          } catch (e) {
            console.error('[mcp apify update error]:', e);
          }
          continue;
        }
      }

      // New lead creation
      const id = randomUUID();
      try {
        const leadService = job.customService || service || '';
        const leadServices = job.customService ? [job.customService] : (services && services.length > 0 ? services : (leadService ? [leadService] : []));
        const leadColleague = job.assignedColleague || '';
        const leadTelefonisti = job.assignedTelefonista ? [job.assignedTelefonista] : [];

        await db.run(`
          INSERT INTO leads (id, name, company, phone, email, status, type, service, services, assignedColleague, assignedTelefonisti, source, notes, address, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, 'Nuovo', 'Lead', ?, ?, ?, ?, 'apify_google_maps', ?, ?, ?, ?)
        `, [id, name, company, phone, email, leadService, JSON.stringify(leadServices), leadColleague, JSON.stringify(leadTelefonisti), notes, address, now, now]);

        await db.run(`
          INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
          VALUES (?, ?, ?, ?, ?, 'Nuovo', 'note')
        `, [randomUUID(), id, now, 'Google Maps Scraper (ChatGPT MCP)', `[IMPORTAZIONE GOOGLE MAPS] Azienda: ${company}${role ? ` | Referente: ${name} (${role})` : ''}`, 'Nuovo']);

        importedCount++;
        if (email) importedIds.push(id);
      } catch (dbErr) {
        console.error('[mcp apify save error]:', dbErr);
      }
    }

    job.result = {
      status: 'DONE',
      ok: true,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: finalLeads.length,
      importedIds,
      message: `Importazione completata con successo! ${importedCount} nuovi lead salvati, ${updatedCount} aggiornati, ${skippedCount} duplicati saltati.`
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(job.result, null, 2) }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. LIST LEADS
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('list_leads', {
    description: 'Elenca e cerca i lead nel gestionale con filtri per stato, tipologia o ricerca testuale. Rispetta rigorosamente i permessi dell\'utente collegato (admin: tutti; telefonista: assegnati a sé o proprie tipologie; venditore: assegnati a sé o con proprio sopralluogo).',
    inputSchema: z.object({
      search: z.string().optional().describe("Ricerca per nome cliente, azienda, telefono o email"),
      status: z.string().optional().describe("Filtra per stato (es: 'Nuovo', 'In Lavorazione', 'Contattato', 'Non Risponde', 'Non Interessato', 'Fissato Appuntamento', 'Chiuso con successo')"),
      service: z.string().optional().describe("Filtra per tipologia impianto (es: 'Fotovoltaico Residenziale', 'Agricolo')"),
      vendorName: z.string().optional().describe("Filtra per agente commerciale (solo admin)"),
      telefonistName: z.string().optional().describe("Filtra per telefonista (solo admin)"),
      limit: z.number().optional().default(20).describe("Numero massimo di lead da restituire (default 20, max 100)"),
      offset: z.number().optional().default(0).describe("Paginazione: indice iniziale"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    let query = 'SELECT * FROM leads';
    const params: any[] = [];
    const whereClauses: string[] = [];

    // Role-based visibility
    if (!isAdmin && isTelefonista && user.name) {
      const tName = user.name.trim();
      whereClauses.push('(assignedTelefonisti LIKE ? OR assignedTelefonisti LIKE ?)');
      params.push(`%"${tName}"%`, `%${tName}%`);
    } else if (!isAdmin && isVenditore && user.name) {
      const vName = user.name.trim();
      query = `
        SELECT DISTINCT l.* FROM leads l
        LEFT JOIN appointments a ON a.leadId = l.id
      `;
      whereClauses.push('(a.assignedVendor = ? OR l.assignedColleague = ?)');
      params.push(vName, vName);
    } else {
      // Admin explicit filters
      if (args.telefonistName && args.telefonistName !== 'Tutti') {
        const tName = args.telefonistName.trim();
        whereClauses.push('(assignedTelefonisti LIKE ? OR assignedTelefonisti LIKE ?)');
        params.push(`%"${tName}"%`, `%${tName}%`);
      }
      if (args.vendorName && args.vendorName !== 'Tutti') {
        query = `
          SELECT DISTINCT l.* FROM leads l
          LEFT JOIN appointments a ON a.leadId = l.id
        `;
        whereClauses.push('(a.assignedVendor = ? OR l.assignedColleague = ?)');
        params.push(args.vendorName.trim(), args.vendorName.trim());
      }
    }

    if (args.status) {
      whereClauses.push('status = ?');
      params.push(args.status.trim());
    }

    if (args.service) {
      whereClauses.push('(service = ? OR services LIKE ?)');
      params.push(args.service.trim(), `%"${args.service.trim()}"%`);
    }

    if (args.search) {
      const s = `%${args.search.trim()}%`;
      whereClauses.push('(name LIKE ? OR company LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ?)');
      params.push(s, s, s, s, s);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY updatedAt DESC LIMIT ? OFFSET ?';
    params.push(Math.min(args.limit || 20, 100), args.offset || 0);

    const rows = await db.all(query, params) as any[];
    const leads = rows.map(r => ({
      id: r.id,
      name: r.name,
      company: r.company || '',
      phone: r.phone || '',
      email: r.email || '',
      status: r.status,
      service: r.service,
      services: parseJsonField(r.services) || [],
      assignedColleague: r.assignedColleague || '',
      assignedTelefonisti: parseJsonField(r.assignedTelefonisti) || [],
      address: r.address || '',
      notes: r.notes || '',
      updatedAt: r.updatedAt
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          count: leads.length,
          leads
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GET LEAD DETAILS
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('get_lead_details', {
    description: 'Recupera la scheda completa di un lead: anagrafica, contatti, stato, note, storico chiamate e appuntamenti associati.',
    inputSchema: z.object({
      leadId: z.string().describe("ID univoco del lead"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [args.leadId]) as any;
    if (!lead) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Lead con ID '${args.leadId}' non trovato.` }]
      };
    }

    // Role check
    if (!isAdmin) {
      if (isTelefonista) {
        const assigned = parseJsonField(lead.assignedTelefonisti) || [];
        const isAssigned = assigned.includes(user.name);
        const userServices = user.services || [];
        const leadServices = parseJsonField(lead.services) || [lead.service];
        const hasServiceMatch = leadServices.some((s: string) => userServices.includes(s));
        if (!isAssigned && !hasServiceMatch) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Non sei autorizzato a visualizzare la scheda di questo lead (non è assegnato a te o alle tue tipologie).` }]
          };
        }
      } else if (isVenditore) {
        const isAssigned = lead.assignedColleague === user.name;
        const appt = await db.get('SELECT id FROM appointments WHERE leadId = ? AND assignedVendor = ? LIMIT 1', [lead.id, user.name]);
        if (!isAssigned && !appt) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Non sei autorizzato a visualizzare questo lead (non è assegnato a te).` }]
          };
        }
      }
    }

    const history = await db.all('SELECT * FROM history WHERE leadId = ? ORDER BY timestamp DESC', [args.leadId]) as any[];
    const appointments = await db.all('SELECT * FROM appointments WHERE leadId = ? ORDER BY dateTime ASC', [args.leadId]) as any[];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          lead: {
            ...lead,
            services: parseJsonField(lead.services) || [],
            assignedTelefonisti: parseJsonField(lead.assignedTelefonisti) || [],
          },
          history,
          appointments
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CREATE LEAD
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('create_lead', {
    description: 'Crea un nuovo lead nel CRM. Gli admin possono assegnare qualsiasi operatore ed agente; i telefonisti creano il lead assegnandolo a se stessi con possibilità di selezionare l\'agente commerciale.',
    inputSchema: z.object({
      name: z.string().describe("Nome e cognome referente o contatto (obbligatorio)"),
      company: z.string().optional().describe("Ragione sociale o azienda"),
      phone: z.string().optional().describe("Telefono o cellulare"),
      email: z.string().optional().describe("Indirizzo email"),
      service: z.string().optional().describe("Tipologia principale (es: 'Fotovoltaico Residenziale', 'Pompa di Calore')"),
      services: z.array(z.string()).optional().describe("Elenco tipologie di interesse"),
      assignedColleague: z.string().optional().describe("Agente commerciale venditore da assegnare"),
      assignedTelefonisti: z.array(z.string()).optional().describe("[Solo Admin] Elenco telefonisti da assegnare"),
      notes: z.string().optional().describe("Note iniziali"),
      address: z.string().optional().describe("Indirizzo e comune dell'immobile"),
      status: z.string().optional().default('Nuovo').describe("Stato iniziale (default: 'Nuovo')"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    if (isVenditore) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Operazione non consentita: gli agenti commerciali (venditori) non possono creare nuovi lead direttamente.' }]
      };
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const srvList = args.services && args.services.length > 0 ? args.services : (args.service ? [args.service] : []);
    const mainService = args.service || (srvList[0] || '');

    // Telefonisti can only assign to themselves as telefonista
    const effectiveTelefonisti = isTelefonista ? [user.name] : (args.assignedTelefonisti || []);

    await db.run(`
      INSERT INTO leads (id, name, company, phone, email, status, type, service, services, assignedColleague, assignedTelefonisti, source, notes, address, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 'Lead', ?, ?, ?, ?, 'chatgpt_mcp', ?, ?, ?, ?)
    `, [
      id, args.name.trim(), args.company?.trim() || '', args.phone?.trim() || '', args.email?.trim() || '',
      args.status || 'Nuovo', mainService, JSON.stringify(srvList),
      args.assignedColleague?.trim() || '', JSON.stringify(effectiveTelefonisti),
      args.notes?.trim() || '', args.address?.trim() || '', now, now
    ]);

    await db.run(`
      INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
      VALUES (?, ?, ?, ?, ?, ?, 'note')
    `, [randomUUID(), id, now, user.name, `[LEAD CREATO DA CHATGPT] ${args.name}${args.company ? ` (${args.company})` : ''}`, args.status || 'Nuovo']);

    const created = await db.get('SELECT * FROM leads WHERE id = ?', [id]) as any;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          message: `Lead '${args.name}' creato con successo nel gestionale!`,
          lead: {
            ...created,
            services: parseJsonField(created.services),
            assignedTelefonisti: parseJsonField(created.assignedTelefonisti)
          }
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. UPDATE LEAD
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('update_lead', {
    description: 'Aggiorna i dati di un lead: stato, note, contatti, tipologia o agente commerciale assegnato.',
    inputSchema: z.object({
      leadId: z.string().describe("ID univoco del lead"),
      status: z.string().optional().describe("Nuovo stato (es: 'In Lavorazione', 'Contattato', 'Non Risponde', 'Fissato Appuntamento', 'Chiuso con successo')"),
      name: z.string().optional().describe("Nome contatto"),
      company: z.string().optional().describe("Azienda"),
      phone: z.string().optional().describe("Telefono"),
      email: z.string().optional().describe("Email"),
      address: z.string().optional().describe("Indirizzo"),
      service: z.string().optional().describe("Tipologia principale"),
      services: z.array(z.string()).optional().describe("Elenco tipologie"),
      assignedColleague: z.string().optional().describe("Agente commerciale venditore assegnato"),
      assignedTelefonisti: z.array(z.string()).optional().describe("[Solo Admin] Telefonisti assegnati"),
      notes: z.string().optional().describe("Note aggiornate"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    const existing = await db.get('SELECT * FROM leads WHERE id = ?', [args.leadId]) as any;
    if (!existing) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Lead con ID '${args.leadId}' non trovato.` }]
      };
    }

    if (isVenditore && existing.assignedColleague !== user.name) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Non hai i permessi per modificare questo lead (non è assegnato a te).' }]
      };
    }

    if (isTelefonista && args.assignedTelefonisti !== undefined) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Solo gli amministratori possono modificare i telefonisti assegnati ad un lead.' }]
      };
    }

    const now = new Date().toISOString();
    const newStatus = args.status ?? existing.status;
    const newName = args.name ?? existing.name;
    const newCompany = args.company ?? existing.company;
    const newPhone = args.phone ?? existing.phone;
    const newEmail = args.email ?? existing.email;
    const newAddress = args.address ?? existing.address;
    const newService = args.service ?? existing.service;
    const newServices = args.services ? JSON.stringify(args.services) : existing.services;
    const newColleague = args.assignedColleague ?? existing.assignedColleague;
    const newTelefonisti = (isAdmin && args.assignedTelefonisti)
      ? JSON.stringify(args.assignedTelefonisti)
      : existing.assignedTelefonisti;
    const newNotes = args.notes ?? existing.notes;

    await db.run(`
      UPDATE leads SET
        name=?, company=?, phone=?, email=?, address=?, service=?, services=?,
        assignedColleague=?, assignedTelefonisti=?, status=?, notes=?, updatedAt=?
      WHERE id=?
    `, [newName, newCompany, newPhone, newEmail, newAddress, newService, newServices, newColleague, newTelefonisti, newStatus, newNotes, now, args.leadId]);

    // History log if status or vendor changed
    const changes: string[] = [];
    if (args.status && args.status !== existing.status) changes.push(`Stato: ${existing.status} ➔ ${args.status}`);
    if (args.assignedColleague && args.assignedColleague !== existing.assignedColleague) changes.push(`Agente: ${existing.assignedColleague || 'Nessuno'} ➔ ${args.assignedColleague}`);

    if (changes.length > 0) {
      await db.run(`
        INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
        VALUES (?, ?, ?, ?, ?, ?, 'note')
      `, [randomUUID(), args.leadId, now, user.name, `[MODIFICA CHATGPT] ${changes.join(' | ')}`, newStatus]);
    }

    const updated = await db.get('SELECT * FROM leads WHERE id = ?', [args.leadId]) as any;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          message: `Lead '${newName}' aggiornato con successo!`,
          lead: {
            ...updated,
            services: parseJsonField(updated.services),
            assignedTelefonisti: parseJsonField(updated.assignedTelefonisti)
          }
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. ADD LEAD NOTE
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('add_lead_note', {
    description: 'Aggiunge un appunto o resoconto di chiamata nella cronologia del lead, con eventuale cambio stato.',
    inputSchema: z.object({
      leadId: z.string().describe("ID del lead"),
      note: z.string().describe("Testo della nota o resoconto della chiamata"),
      statusAfterCall: z.string().optional().describe("Nuovo stato del lead a seguito della chiamata (opzionale)"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [args.leadId]) as any;
    if (!lead) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Lead con ID '${args.leadId}' non trovato.` }]
      };
    }

    const now = new Date().toISOString();
    const finalStatus = args.statusAfterCall || lead.status;

    await db.run(`
      INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
      VALUES (?, ?, ?, ?, ?, ?, 'note')
    `, [randomUUID(), args.leadId, now, user.name, args.note.trim(), finalStatus]);

    await db.run('UPDATE leads SET status=?, updatedAt=? WHERE id=?', [finalStatus, now, args.leadId]);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          message: `Nota registrata per il cliente '${lead.name}'.`,
          status: finalStatus,
          timestamp: now
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. LIST APPOINTMENTS
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('list_appointments', {
    description: 'Elenca gli appuntamenti (sopralluoghi, telefonate prefissate, incontri) con filtri per data, agente e tipologia. Gli admin vedono tutti gli appuntamenti; i telefonisti vedono i propri; i venditori vedono solo i propri assegnati.',
    inputSchema: z.object({
      startDate: z.string().optional().describe("Data iniziale (formato YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Data finale (formato YYYY-MM-DD)"),
      vendorName: z.string().optional().describe("Filtra per agente commerciale (solo admin)"),
      appointmentType: z.string().optional().describe("Filtra per tipologia ('visit', 'call', 'phone_meeting', 'office')"),
      completed: z.boolean().optional().describe("Filtra completati o da svolgere"),
      limit: z.number().optional().default(30).describe("Numero massimo di appuntamenti (default 30)"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    let query = `
      SELECT a.*, l.name as leadNameFromDb, l.phone as leadPhone, l.company as leadCompany, l.address as leadAddress
      FROM appointments a
      INNER JOIN leads l ON l.id = a.leadId
    `;
    const params: any[] = [];
    const whereClauses: string[] = [];

    // Role filtering
    if (!isAdmin && isTelefonista && user.name) {
      whereClauses.push('(LOWER(TRIM(a.colleague)) = LOWER(TRIM(?)) OR l.assignedTelefonisti LIKE ?)');
      params.push(user.name, `%"${user.name}"%`);
    } else if (!isAdmin && isVenditore && user.name) {
      whereClauses.push('LOWER(TRIM(a.assignedVendor)) = LOWER(TRIM(?))');
      params.push(user.name);
    } else if (args.vendorName && args.vendorName !== 'Tutti') {
      whereClauses.push('LOWER(TRIM(a.assignedVendor)) = LOWER(TRIM(?))');
      params.push(args.vendorName.trim());
    }

    if (args.startDate) {
      whereClauses.push('a.dateTime >= ?');
      params.push(args.startDate.includes('T') ? args.startDate : `${args.startDate}T00:00:00`);
    }

    if (args.endDate) {
      whereClauses.push('a.dateTime <= ?');
      params.push(args.endDate.includes('T') ? args.endDate : `${args.endDate}T23:59:59`);
    }

    if (args.appointmentType) {
      whereClauses.push('a.appointmentType = ?');
      params.push(args.appointmentType.trim());
    }

    if (args.completed !== undefined) {
      whereClauses.push('a.completed = ?');
      params.push(args.completed ? 'true' : 'false');
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY a.dateTime ASC LIMIT ?';
    params.push(Math.min(args.limit || 30, 100));

    const rows = await db.all(query, params) as any[];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          count: rows.length,
          appointments: rows.map(r => ({
            id: r.id,
            leadId: r.leadId,
            leadName: r.leadName || r.leadNameFromDb,
            company: r.leadCompany,
            phone: r.leadPhone,
            address: r.leadAddress,
            dateTime: r.dateTime,
            appointmentType: r.appointmentType,
            title: r.title,
            notes: r.notes,
            assignedVendor: r.assignedVendor,
            colleague: r.colleague,
            visitStatus: r.visitStatus,
            completed: r.completed === 'true' || r.completed === true,
          }))
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. CREATE APPOINTMENT (DI TUTTI I TIPI & ASSEGNAZIONE AGENTE)
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('create_appointment', {
    description: 'Aggiunge un appuntamento (sopralluogo sul posto, appuntamento telefonico prefissato, chiamata, incontro in sede) e lo assegna a un agente commerciale. Sincronizza istantaneamente Google Calendar dell\'agente assegnato e scrive nello storico del lead.',
    inputSchema: z.object({
      leadId: z.string().describe("ID del lead per cui fissare l'appuntamento"),
      dateTime: z.string().describe("Data e ora dell'appuntamento (es: '2026-10-25 15:30' o formato ISO '2026-10-25T15:30:00')"),
      appointmentType: z.enum(['visit', 'phone_meeting', 'call', 'office', 'other']).default('visit').describe("Tipo di appuntamento: 'visit' (sopralluogo tecnico/commerciale sul posto), 'phone_meeting' (appuntamento telefonico prefissato), 'call' (chiamata generica), 'office' (in sede), 'other' (altro)"),
      assignedVendor: z.string().describe("Nome esatto dell'agente commerciale a cui assegnare l'appuntamento (es: 'Marco Rossi', 'Stefano Bianchi', ecc.)"),
      title: z.string().optional().describe("Titolo causale (es: 'Sopralluogo Impianto 6kWp + Batteria')"),
      notes: z.string().optional().describe("Note, indicazioni per l'agente o istruzioni speciali"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [args.leadId]) as any;
    if (!lead) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Lead con ID '${args.leadId}' non trovato.` }]
      };
    }

    // Normalizza la data in formato ISO
    let formattedDateTime = args.dateTime.trim();
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2})?$/.test(formattedDateTime)) {
      formattedDateTime = formattedDateTime.replace(' ', 'T');
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const leadName = lead.name + (lead.company ? ` (${lead.company})` : '');
    const appointmentTitle = args.title || (args.appointmentType === 'visit' ? 'Sopralluogo Tecnico' : 'Appuntamento');

    await db.run(`
      INSERT INTO appointments (id, leadId, leadName, colleague, assignedVendor, dateTime, title, notes, appointmentType, googleEventId, visitStatus, completed, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'pending', 'false', ?)
    `, [
      id, args.leadId, leadName, user.name, args.assignedVendor.trim(),
      formattedDateTime, appointmentTitle, args.notes?.trim() || '',
      args.appointmentType, now
    ]);

    // Registra nello storico del lead
    try {
      const apptDateHuman = new Date(formattedDateTime).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const typeLabel = args.appointmentType === 'visit' ? 'Sopralluogo' : (args.appointmentType === 'phone_meeting' ? 'Appuntamento Telefonico' : 'Appuntamento');
      const histNote = `[${typeLabel.toUpperCase()} FISSATO] ${appointmentTitle} in data ${apptDateHuman} | Agente Commerciale: ${args.assignedVendor}${args.notes ? ` - Note: ${args.notes}` : ''}`;

      await db.run(`
        INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
        VALUES (?, ?, ?, ?, ?, 'Fissato Appuntamento', 'note')
      `, [randomUUID(), args.leadId, now, user.name, histNote]);

      // Aggiorna anche stato lead se era Nuovo o In Lavorazione
      if (['Nuovo', 'In Lavorazione', 'Contattato'].includes(lead.status)) {
        await db.run('UPDATE leads SET status = ?, assignedColleague = ?, updatedAt = ? WHERE id = ?', [
          'Fissato Appuntamento',
          args.assignedVendor.trim(),
          now,
          args.leadId
        ]);
      }
    } catch (hErr) {
      console.error('[mcp appointments/create] Errore inserimento storico:', hErr);
    }

    const created = await db.get('SELECT * FROM appointments WHERE id = ?', [id]) as any;

    // Sincronizzazione automatica con Google Calendar dell'agente assegnato
    try {
      await syncAppointmentToVendorCalendar(created);
    } catch (gErr) {
      console.error('[mcp calendar sync]:', gErr);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          message: `Appuntamento fissato con successo per ${lead.name} ed assegnato all'agente ${args.assignedVendor}!`,
          appointment: created
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. UPDATE APPOINTMENT (MODIFICA, RIASSEGNAZIONE AGENTE & STATO)
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('update_appointment', {
    description: 'Modifica o riassegna un appuntamento (cambio data/ora, note, stato sopralluogo, o riassegnazione ad un altro agente). In caso di riassegnazione agente, aggiorna automaticamente Google Calendar.',
    inputSchema: z.object({
      appointmentId: z.string().describe("ID univoco dell'appuntamento"),
      assignedVendor: z.string().optional().describe("Nuovo agente commerciale a cui riassegnare l'appuntamento (es: 'Marco Rossi')"),
      dateTime: z.string().optional().describe("Nuova data e ora (es: '2026-10-25 15:30')"),
      title: z.string().optional().describe("Nuovo titolo"),
      notes: z.string().optional().describe("Nuove note o istruzioni"),
      appointmentType: z.enum(['visit', 'phone_meeting', 'call', 'office', 'other']).optional().describe("Nuova tipologia appuntamento"),
      visitStatus: z.enum(['pending', 'completed', 'cancelled', 'no_show']).optional().describe("Stato sopralluogo ('pending', 'completed', 'cancelled', 'no_show')"),
      completed: z.boolean().optional().describe("Segna come completato o da svolgere"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    const existing = await db.get('SELECT * FROM appointments WHERE id = ?', [args.appointmentId]) as any;
    if (!existing) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Appuntamento con ID '${args.appointmentId}' non trovato.` }]
      };
    }

    if (isVenditore && existing.assignedVendor !== user.name) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Non hai i permessi per modificare questo appuntamento (non è assegnato a te).' }]
      };
    }

    let newDateTime = args.dateTime ? args.dateTime.trim().replace(' ', 'T') : existing.dateTime;
    const newVendor = args.assignedVendor?.trim() || existing.assignedVendor;
    const newTitle = args.title ?? existing.title;
    const newNotes = args.notes ?? existing.notes;
    const newType = args.appointmentType ?? existing.appointmentType;
    const newVisitStatus = args.visitStatus ?? existing.visitStatus;
    const newCompleted = args.completed !== undefined ? String(args.completed) : existing.completed;

    await db.run(`
      UPDATE appointments SET
        assignedVendor=?, dateTime=?, title=?, notes=?, appointmentType=?,
        visitStatus=?, completed=?
      WHERE id=?
    `, [newVendor, newDateTime, newTitle, newNotes, newType, newVisitStatus, newCompleted, args.appointmentId]);

    // Reassignment check: rimuovi da vecchio calendario e sincronizza su nuovo
    const reassigned = newVendor && newVendor !== existing.assignedVendor;
    if (reassigned && existing.vendorGoogleEventId) {
      try {
        await deleteVendorCalendarEvent(existing);
        await db.run('UPDATE appointments SET vendorGoogleEventId = ? WHERE id = ?', ['', args.appointmentId]);
      } catch (e) {
        console.error('[mcp reassign del]:', e);
      }
    }

    const updated = await db.get('SELECT * FROM appointments WHERE id = ?', [args.appointmentId]) as any;

    try {
      await syncAppointmentToVendorCalendar(updated);
    } catch (e) {
      console.error('[mcp reassign sync]:', e);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          message: reassigned
            ? `Appuntamento riassegnato con successo a ${newVendor}!`
            : `Appuntamento aggiornato con successo!`,
          appointment: updated
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. DELETE APPOINTMENT
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('delete_appointment', {
    description: 'Elimina un appuntamento e rimuove l\'evento dal Google Calendar dell\'agente assegnato.',
    inputSchema: z.object({
      appointmentId: z.string().describe("ID univoco dell'appuntamento da eliminare"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async (args) => {
    const existing = await db.get('SELECT * FROM appointments WHERE id = ?', [args.appointmentId]) as any;
    if (!existing) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Appuntamento con ID '${args.appointmentId}' non trovato.` }]
      };
    }

    if (!isAdmin && existing.colleague !== user.name) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Solo un amministratore o il telefonista che ha creato l\'appuntamento possono eliminarlo.' }]
      };
    }

    await db.run('DELETE FROM appointments WHERE id = ?', [args.appointmentId]);
    if (existing.vendorGoogleEventId) {
      try {
        await deleteVendorCalendarEvent(existing);
      } catch (e) {
        console.error('[mcp delete appt cal]:', e);
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          message: `Appuntamento '${existing.title}' del ${existing.dateTime} eliminato con successo.`
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. LIST COLLEAGUES
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('list_colleagues', {
    description: 'Elenca i colleghi, agenti commerciali (venditori) e telefonisti registrati nel gestionale con ruoli, tipologie gestite e rating clienti.',
    inputSchema: z.object({
      role: z.enum(['tutti', 'venditore', 'telefonista', 'admin']).optional().default('tutti').describe("Filtra per ruolo: 'venditore' per vedere gli agenti commerciali a cui assegnare sopralluoghi, 'telefonista' per gli operatori, 'admin' o 'tutti'"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    let query = 'SELECT id, name, role, email, phone, services, avgRating, reviewCount FROM colleagues';
    const params: any[] = [];
    if (args.role && args.role !== 'tutti') {
      query += ' WHERE role = ?';
      params.push(args.role);
    }
    query += ' ORDER BY role ASC, name ASC';

    const rows = await db.all(query, params) as any[];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          count: rows.length,
          colleagues: rows.map(r => ({
            id: r.id,
            name: r.name,
            role: r.role,
            email: r.email,
            phone: r.phone,
            services: parseJsonField(r.services) || [],
            avgRating: r.avgRating || 0,
            reviewCount: r.reviewCount || 0
          }))
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. LIST SERVICES (TIPOLOGIE)
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('list_services', {
    description: 'Elenca tutte le tipologie di impianti e servizi trattati dall\'azienda (es: Fotovoltaico Residenziale, Fotovoltaico Industriale, Pompe di Calore, Comunità Energetiche CER, ecc.).',
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => {
    const rows = await db.all('SELECT * FROM services ORDER BY name ASC') as any[];
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          count: rows.length,
          services: rows.map(r => ({ id: r.id, name: r.name }))
        }, null, 2)
      }]
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. GET CRM STATS
  // ─────────────────────────────────────────────────────────────────────────────
  server.registerTool('get_crm_stats', {
    description: 'Fornisce una sintesi dei principali indicatori e KPI del gestionale (totale lead, distribuzione per stato, appuntamenti previsti oggi e questa settimana), filtrati in base al ruolo dell\'utente collegato.',
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let leadsQuery = 'SELECT status, COUNT(*) as count FROM leads';
    let apptsQuery = 'SELECT COUNT(*) as count FROM appointments a INNER JOIN leads l ON l.id = a.leadId WHERE a.dateTime >= ? AND a.dateTime <= ?';
    const leadsParams: any[] = [];
    const apptsParams: any[] = [`${today}T00:00:00`, `${nextWeek}T23:59:59`];

    if (!isAdmin && isTelefonista && user.name) {
      leadsQuery += ' WHERE (assignedTelefonisti LIKE ? OR assignedTelefonisti LIKE ?)';
      leadsParams.push(`%"${user.name}"%`, `%${user.name}%`);
      apptsQuery += ' AND (LOWER(TRIM(a.colleague)) = LOWER(TRIM(?)) OR l.assignedTelefonisti LIKE ?)';
      apptsParams.push(user.name, `%"${user.name}"%`);
    } else if (!isAdmin && isVenditore && user.name) {
      leadsQuery = `
        SELECT l.status, COUNT(DISTINCT l.id) as count FROM leads l
        LEFT JOIN appointments a ON a.leadId = l.id
        WHERE (a.assignedVendor = ? OR l.assignedColleague = ?)
      `;
      leadsParams.push(user.name, user.name);
      apptsQuery += ' AND LOWER(TRIM(a.assignedVendor)) = LOWER(TRIM(?))';
      apptsParams.push(user.name);
    }

    leadsQuery += ' GROUP BY status';
    const statusCounts = await db.all(leadsQuery, leadsParams) as any[];
    const apptCountRow = await db.get(apptsQuery, apptsParams) as any;

    const totalLeads = statusCounts.reduce((acc, row) => acc + Number(row.count || 0), 0);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          scope: isAdmin ? 'Azienda intera (Admin)' : (isTelefonista ? `Telefonista: ${user.name}` : `Venditore: ${user.name}`),
          totalLeads,
          leadsByStatus: statusCounts.reduce((obj, row) => {
            obj[row.status || 'Senza Stato'] = Number(row.count);
            return obj;
          }, {}),
          upcomingAppointmentsNext7Days: Number(apptCountRow?.count || 0)
        }, null, 2)
      }]
    };
  });
}

