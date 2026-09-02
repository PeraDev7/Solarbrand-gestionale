import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { google } from 'googleapis';
import { db, randomUUID, parseJsonField, seedDemoDataIfNeeded, initDb, migrateAssignments, cleanupOrphanRecords } from './src/lib/database.js';
import { hashPassword, verifyPassword } from './src/lib/passwords.js';
import { buildSearchStrings, buildLocationQuery, buildActorInput, startApifyRun, parseGoogleMapsItems } from './src/lib/google-maps-scraper.js';
import { createJob, getJob, updateJob } from './src/lib/scraper-jobs.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Demo accounts can be selected with one click, without a password. Set
// DEMO_MODE=false on the production VPS to force every telefonista/agente
// to authenticate with their own username + password.
const DEMO_MODE = process.env.DEMO_MODE !== 'false';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function createSession(colleagueId: string) {
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.run('INSERT INTO sessions (token, colleagueId, createdAt, expiresAt) VALUES (?, ?, ?, ?)', [token, colleagueId, now.toISOString(), expiresAt.toISOString()]);
  return token;
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/auth/google/callback`
  );
}

app.use(express.json({ limit: '100mb' }));

// ── API AUTHENTICATION MIDDLEWARE ──
// Every /api/* route requires a valid session token, except the public
// entry points below (login itself, the Google OAuth redirect dance,
// externally-triggered webhooks/tracking pixels, and the public review form).
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/demo-login',
  '/api/auth/demo-colleagues',
  '/api/auth/logout',
  '/api/auth/check-password',
  '/api/auth/google/start',
  '/api/auth/google/callback',
  '/api/config',
  '/api/reviews/submit',
];
const PUBLIC_API_PREFIXES = ['/api/webhooks/', '/api/email-track/'];

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  if (PUBLIC_API_PATHS.includes(req.path)) return next();
  if (PUBLIC_API_PREFIXES.some(prefix => req.path.startsWith(prefix))) return next();

  const authHeader = req.headers['authorization'];
  // Plain <a href> navigations (e.g. file downloads) can't set a custom header,
  // so they pass the session token as a query param instead.
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || (typeof req.query.token === 'string' ? req.query.token : null);
  if (!token) return res.status(401).json({ error: 'Accesso non autenticato' });

  const session = await db.get('SELECT * FROM sessions WHERE token = ?', [token]) as any;
  if (!session || new Date(session.expiresAt) < new Date()) {
    return res.status(401).json({ error: 'Sessione scaduta, effettua di nuovo il login' });
  }

  (req as any).colleagueId = session.colleagueId;
  next();
});

// Team management (roles, passwords, adding/removing colleagues) is
// restricted to sessions belonging to a colleague with role 'admin'.
async function requireAdmin(req: express.Request, res: express.Response): Promise<boolean> {
  const colleagueId = (req as any).colleagueId;
  const requester = colleagueId ? (await db.get('SELECT * FROM colleagues WHERE id = ?', [colleagueId]) as any) : null;
  if (!requester || requester.role !== 'admin') {
    res.status(403).json({ error: 'Solo un amministratore può eseguire questa operazione' });
    return false;
  }
  return true;
}

// Initialize database (MySQL or SQLite) then seed demo data if needed, migrate assignments and clean orphan records
(async () => { await initDb(); await seedDemoDataIfNeeded(); await migrateAssignments(); await cleanupOrphanRecords(); })();

// Flush WAL into the main .db file and close cleanly on exit, otherwise
// recent writes (e.g. saved settings) can sit only in app.db-wal and be
// lost when the launcher script copies/rotates the database file.
function shutdownGracefully() {
  try {
  } catch (e) {
    console.error('Errore durante la chiusura del database:', e);
  }
  process.exit(0);
}
process.on('SIGINT', shutdownGracefully);
process.on('SIGTERM', shutdownGracefully);

// ── LEADS ──
app.get('/api/leads', async (req, res) => {
  const { vendorName, telefonistName } = req.query;
  let query = 'SELECT * FROM leads';
  let params: any[] = [];

  if (telefonistName) {
    // Telefonista: vede lead assegnati direttamente a sé (per nome in JSON) OPPURE per servizio
    const tName = telefonistName as string;
    const colleague = await db.get('SELECT services FROM colleagues WHERE name = ?', [tName]) as any;
    const telServices: string[] = parseJsonField(colleague?.services);

    if (telServices.length > 0) {
      // Lead con il suo nome in assignedTelefonisti OPPURE con un servizio in services
      const svcPlaceholders = telServices.map(() => '?').join(',');
      query = `
        SELECT * FROM leads
        WHERE JSON_CONTAINS(assignedTelefonisti, JSON_QUOTE(?))
           OR service IN (${svcPlaceholders})
           OR EXISTS (
             SELECT 1 FROM JSON_TABLE(services, '$[*]' COLUMNS (svc TEXT PATH '$')) jt
             WHERE jt.svc IN (${svcPlaceholders})
           )
      `;
      params = [tName, ...telServices, ...telServices];
    } else {
      query = `SELECT * FROM leads WHERE JSON_CONTAINS(assignedTelefonisti, JSON_QUOTE(?))`;
      params = [tName];
    }
  } else if (vendorName) {
    // Venditore (agente): vede lead con sopralluogo assegnato a sé o come assignedColleague
    query = `
      SELECT DISTINCT l.* FROM leads l
      LEFT JOIN appointments a ON a.leadId = l.id
      WHERE a.assignedVendor = ? OR l.assignedColleague = ?
    `;
    params = [vendorName as string, vendorName as string];
  }

  query += ' ORDER BY updatedAt DESC';
  const rows = await db.all(query, params) as any[];
  const leads = rows.map(r => ({
    ...r,
    services: parseJsonField(r.services),
    assignedTelefonisti: parseJsonField(r.assignedTelefonisti),
  }));
  res.json(leads);
});

app.post('/api/leads', async (req, res) => {
  const colleagueId = (req as any).colleagueId;
  const requester = colleagueId ? (await db.get('SELECT * FROM colleagues WHERE id = ?', [colleagueId]) as any) : null;
  const isTelefonista = requester && requester.role === 'telefonista';

  const { name, company='', phone='', email='', status='Nuovo', type='Lead',
          service='', services=[], assignedColleague='', assignedTelefonisti=[], notes='', address='', source='manual' } = req.body;

  if (!name) return res.status(400).json({ error: 'name è obbligatorio' });

  // Un telefonista (non admin) NON può assegnare un lead a telefonisti, ma solo ad agenti!
  const effectiveTelefonisti = isTelefonista ? [] : assignedTelefonisti;

  const id = randomUUID();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO leads (id, name, company, phone, email, status, type, service, services, assignedColleague, assignedTelefonisti, notes, address, source, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, name, company, phone, email ? email.toLowerCase() : '', status, type, service, JSON.stringify(services), assignedColleague, JSON.stringify(effectiveTelefonisti), notes, address, source, now, now]);

  if (notes && notes.trim()) {
    await db.run(`
      INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [randomUUID(), id, now, assignedColleague || 'Sistema', notes, status, 'note']);
  }

  const lead = await db.get('SELECT * FROM leads WHERE id = ?', [id]) as any;
  lead.services = parseJsonField(lead.services);
  lead.assignedTelefonisti = parseJsonField(lead.assignedTelefonisti);
  res.status(201).json(lead);
});

// L'admin/telefonista designa un account SMTP come "Email Aziendale" da
// Impostazioni Server; è quello usato per le due email automatiche di
// sistema (ringraziamento post-sopralluogo, richiesta recensione). Finché
// nessuno lo sceglie esplicitamente, si ricade sul primo account creato.
async function getCompanySmtpAccount(): Promise<any> {
  const setting = await db.get("SELECT value FROM settings WHERE `key` = 'company_smtp_id'", []) as any;
  if (setting?.value) {
    const chosen = await db.get('SELECT * FROM smtp_accounts WHERE id = ?', [setting.value]);
    if (chosen) return chosen;
  }
  return await db.get('SELECT * FROM smtp_accounts ORDER BY createdAt ASC LIMIT 1', []);
}

async function sendSystemEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const smtp = await getCompanySmtpAccount() as any;
    if (!smtp) {
      console.warn('[sendSystemEmail] Nessun account SMTP configurato.');
      return false;
    }
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user_email, pass: smtp.pass },
    });
    await transporter.sendMail({
      from: smtp.user_email,
      to,
      subject,
      html: body,
    });
    return true;
  } catch (err) {
    console.error('[sendSystemEmail] Errore invio email:', err);
    return false;
  }
}

app.put('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM leads WHERE id = ?', [id]) as any;
  if (!existing) return res.status(404).json({ error: 'Lead non trovato' });

  // Security check: un telefonista (non admin) NON può assegnare un lead a telefonisti, ma solo ad agenti!
  const colleagueId = (req as any).colleagueId;
  const requester = colleagueId ? (await db.get('SELECT * FROM colleagues WHERE id = ?', [colleagueId]) as any) : null;
  const isTelefonista = requester && requester.role === 'telefonista';

  const {
    name = existing.name,
    company = existing.company,
    phone = existing.phone,
    email = existing.email,
    status = existing.status,
    type = existing.type,
    service = existing.service,
    services,
    assignedColleague = existing.assignedColleague,
    assignedTelefonisti,
    address = existing.address,
  } = req.body;

  const now = new Date().toISOString();
  const servicesJson = JSON.stringify(services !== undefined ? services : parseJsonField(existing.services));
  
  // Se l'utente è un telefonista non admin, ignora modifiche a assignedTelefonisti e mantieni quelli già assegnati dall'admin
  const effectiveTelefonisti = isTelefonista 
    ? parseJsonField(existing.assignedTelefonisti) 
    : (assignedTelefonisti !== undefined ? assignedTelefonisti : parseJsonField(existing.assignedTelefonisti));
  const telefonistiJson = JSON.stringify(effectiveTelefonisti);

  await db.run(`
    UPDATE leads
    SET name=?, company=?, phone=?, email=?, status=?, type=?, service=?, services=?, assignedColleague=?, assignedTelefonisti=?, address=?, updatedAt=?
    WHERE id=?
  `, [name, company, phone, email ? email.toLowerCase() : '', status, type, service, servicesJson, assignedColleague, telefonistiJson, address, now, id]);

  // Trigger automatic review email if status changed to 'Chiuso con successo'
  if (status === 'Chiuso con successo' && existing.status !== 'Chiuso con successo' && email) {
    try {
      const reviewTpl = await db.get("SELECT * FROM email_templates WHERE templateType = 'review_request'", []) as any;
      if (reviewTpl) {
        const token = randomUUID();
        const reviewId = randomUUID();
        const vendor = assignedColleague || existing.assignedColleague || 'Consulente SolarBrand';
        
        const customerName = name || company || 'Cliente';
        const customerEmail = email ? email.toLowerCase() : '';

        await db.run(`
          INSERT INTO reviews (id, leadId, leadName, leadEmail, vendorName, rating, comment, token, usedAt, createdAt)
          VALUES (?, ?, ?, ?, ?, 5, '', ?, '', ?)
        `, [reviewId, id, customerName, customerEmail, vendor, token, now]);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const reviewLink = `${protocol}://${host}/recensione?token=${token}`;

        const finalSubject = reviewTpl.subject
          .replace(/\{nome\}/g, name)
          .replace(/\{azienda\}/g, company || name)
          .replace(/\{agente\}/g, vendor);

        const finalBody = reviewTpl.body
          .replace(/\{nome\}/g, name)
          .replace(/\{azienda\}/g, company || name)
          .replace(/\{agente\}/g, vendor)
          .replace(/\{link_recensione\}/g, reviewLink);

        sendSystemEmail(email, finalSubject, finalBody).then(async sent => {
          if (sent) {
            await db.run(`
              INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
              VALUES (?, ?, ?, ?, ?, ?, 'email')
            `, [randomUUID(), id, now, 'Sistema', `[EMAIL RECENSIONE INVIATA] Richiesta recensione inviata a ${email} per l'agente ${vendor}`, status]);
          }
        });
      }
    } catch (e) {
      console.error('Errore invio email recensione:', e);
    }
  }

  const updated = await db.get('SELECT * FROM leads WHERE id = ?', [id]) as any;
  updated.services = parseJsonField(updated.services);
  updated.assignedTelefonisti = parseJsonField(updated.assignedTelefonisti);
  res.json(updated);
});

app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  await db.run('DELETE FROM appointments WHERE leadId = ?', [id]);
  await db.run('DELETE FROM visit_reports WHERE leadId = ?', [id]);
  await db.run('DELETE FROM tasks WHERE leadId = ?', [id]);
  await db.run('DELETE FROM history WHERE leadId = ?', [id]);
  await db.run('DELETE FROM lead_attachments WHERE leadId = ?', [id]);
  await db.run('DELETE FROM email_campaign_recipients WHERE leadId = ?', [id]);
  await db.run('DELETE FROM leads WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ── HISTORY ──
app.get('/api/history', async (req, res) => {
  const rows = await db.all(`
    SELECT h.*, l.name as leadName, l.company as leadCompany, l.service as leadService, l.services as leadServices
    FROM history h
    LEFT JOIN leads l ON l.id = h.leadId
    ORDER BY h.timestamp DESC
  `, []) as any[];
  res.json(rows.map(r => ({
    ...r,
    leadServices: parseJsonField(r.leadServices),
  })));
});

app.get('/api/leads/:leadId/history', async (req, res) => {
  const items = await db.all('SELECT * FROM history WHERE leadId = ? ORDER BY timestamp DESC', [req.params.leadId]);
  res.json(items);
});

app.post('/api/leads/:leadId/history', async (req, res) => {
  const { leadId } = req.params;
  const { colleague='', note='', statusAfterCall='', type='note' } = req.body;
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, leadId, now, colleague, note, statusAfterCall, type]);

  await db.run('UPDATE leads SET updatedAt=? WHERE id=?', [now, leadId]);
  res.status(201).json({ id, leadId, timestamp: now, colleague, note, statusAfterCall, type });
});

app.delete('/api/leads/:leadId/history/:histId', async (req, res) => {
  await db.run('DELETE FROM history WHERE id = ? AND leadId = ?', [req.params.histId, req.params.leadId]);
  res.json({ ok: true });
});

// ── COLLEAGUES ──
app.get('/api/colleagues', async (req, res) => {
  const rows = await db.all('SELECT * FROM colleagues ORDER BY name ASC', []) as any[];
  res.json(rows.map(r => {
    const { pin, passwordHash, googleTokens, ...safe } = r;
    return {
      ...safe,
      services: parseJsonField(r.services),
      visibleColleagues: parseJsonField(r.visibleColleagues),
      passwordSet: Boolean(passwordHash),
      googleCalendarConnected: Boolean(googleTokens),
    };
  }));
});

app.post('/api/colleagues', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { name, role='telefonista', phone='', email='' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name richiesto' });
  if (email && email.trim()) {
    const dupEmail = await db.get('SELECT id FROM colleagues WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (dupEmail) return res.status(409).json({ error: 'Email già usata da un altro profilo' });
  }
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const now = new Date().toISOString();
  try {
    await db.run(`
      INSERT INTO colleagues (id, name, services, visibleColleagues, role, phone, email, username, createdAt)
      VALUES (?, ?, '[]', '[]', ?, ?, ?, ?, ?)
    `, [id, name.trim(), role, phone, email, id, now]);
    res.status(201).json({ id, name: name.trim(), services: [], visibleColleagues: [], role, phone, email, username: id, passwordSet: false, googleCalendarConnected: false, createdAt: now });
  } catch (e: any) {
    res.status(409).json({ error: 'Operatore già esistente' });
  }
});

app.put('/api/colleagues/:id', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM colleagues WHERE id = ?', [id]) as any;
  if (!existing) return res.status(404).json({ error: 'Non trovato' });

  const { name, services, visibleColleagues, role, phone, email } = req.body;
  if (email && email.trim() && email.trim().toLowerCase() !== (existing.email || '').toLowerCase()) {
    const dupEmail = await db.get('SELECT id FROM colleagues WHERE LOWER(email) = LOWER(?) AND id != ?', [email.trim(), id]);
    if (dupEmail) return res.status(409).json({ error: 'Email già usata da un altro profilo' });
  }
  const newName = name ?? existing.name;
  const newRole = role ?? existing.role;
  const newPhone = phone ?? existing.phone;
  const newEmail = email ?? existing.email;
  const newServices = JSON.stringify(services !== undefined ? services : parseJsonField(existing.services));
  const newVisible = JSON.stringify(visibleColleagues !== undefined ? visibleColleagues : parseJsonField(existing.visibleColleagues));

  await db.run(`
    UPDATE colleagues
    SET name=?, services=?, visibleColleagues=?, role=?, phone=?, email=?
    WHERE id=?
  `, [newName, newServices, newVisible, newRole, newPhone, newEmail, id]);

  if (name && name !== existing.name) {
    await db.run('UPDATE leads SET assignedColleague=? WHERE assignedColleague=?', [name, existing.name]);
  }

  const updated = await db.get('SELECT * FROM colleagues WHERE id = ?', [id]) as any;
  const { pin, passwordHash, googleTokens, ...safeUpdated } = updated;
  res.json({
    ...safeUpdated,
    services: parseJsonField(updated.services),
    visibleColleagues: parseJsonField(updated.visibleColleagues),
    passwordSet: Boolean(passwordHash),
    googleCalendarConnected: Boolean(googleTokens),
  });
});

app.delete('/api/colleagues/:id', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (req.params.id === (req as any).colleagueId) {
    return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso profilo admin' });
  }
  await db.run('DELETE FROM colleagues WHERE id = ?', [req.params.id]);
  await db.run('DELETE FROM sessions WHERE colleagueId = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── SERVICES ──
app.get('/api/services', async (req, res) => {
  res.json(await db.all('SELECT * FROM services ORDER BY name ASC', []));
});

app.post('/api/services', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name richiesto' });
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  const now = new Date().toISOString();
  try {
    await db.run('INSERT INTO services (id, name, createdAt) VALUES (?, ?, ?)', [id, name.trim(), now]);
    res.status(201).json({ id, name: name.trim(), createdAt: now });
  } catch (e: any) {
    res.status(409).json({ error: 'Servizio già esistente' });
  }
});

app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM services WHERE id = ?', [id]) as any;
  if (!existing) return res.status(404).json({ error: 'Non trovato' });

  const { name } = req.body;
  await db.run('UPDATE services SET name=? WHERE id=?', [name, id]);

  if (name !== existing.name) {
    const leads = await db.all('SELECT id, service, services FROM leads', []) as any[];
    for (const lead of leads) {
      const srvArr = parseJsonField(lead.services);
      const updated = srvArr.map((s: string) => s === existing.name ? name : s);
      const newService = lead.service === existing.name ? name : lead.service;
      await db.run('UPDATE leads SET service=?, services=? WHERE id=?', [newService, JSON.stringify(updated), lead.id]);
    }

    const cols = await db.all('SELECT id, services FROM colleagues', []) as any[];
    for (const col of cols) {
      const sArr = parseJsonField(col.services);
      if (sArr.includes(existing.name)) {
        await db.run('UPDATE colleagues SET services=? WHERE id=?', [JSON.stringify(sArr.map((s: string) => s === existing.name ? name : s)),
          col.id]);
      }
    }
  }

  res.json({ id, name, createdAt: existing.createdAt });
});

app.delete('/api/services/:id', async (req, res) => {
  await db.run('DELETE FROM services WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── APPOINTMENTS ──
app.get('/api/appointments', async (req, res) => {
  const { vendorName } = req.query;
  const colleagueId = (req as any).colleagueId;
  const requester = colleagueId ? (await db.get('SELECT * FROM colleagues WHERE id = ?', [colleagueId]) as any) : null;

  let query = `
    SELECT a.* FROM appointments a
    INNER JOIN leads l ON l.id = a.leadId
  `;
  let params: any[] = [];
  const whereClauses: string[] = [];

  if (vendorName) {
    whereClauses.push('LOWER(TRIM(a.assignedVendor)) = LOWER(TRIM(?))');
    params.push(vendorName as string);
  }

  // Se l'utente è un telefonista (non admin), NON può vedere gli appuntamenti degli altri telefonisti!
  if (requester && requester.role === 'telefonista') {
    whereClauses.push('LOWER(TRIM(a.colleague)) = LOWER(TRIM(?))');
    params.push(requester.name);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY a.dateTime ASC';
  res.json(await db.all(query, params));
});

app.post('/api/appointments', async (req, res) => {
  const { leadId, leadName='', colleague='', assignedVendor='', dateTime, title='', notes='', appointmentType='visit', googleEventId='' } = req.body;
  if (!leadId || !dateTime) return res.status(400).json({ error: 'leadId e dateTime richiesti' });
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.run(`
    INSERT INTO appointments (id, leadId, leadName, colleague, assignedVendor, dateTime, title, notes, appointmentType, googleEventId, visitStatus, completed, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'false', ?)
  `, [id, leadId, leadName, colleague, assignedVendor, dateTime, title, notes, appointmentType, googleEventId, now]);

  const created = await db.get('SELECT * FROM appointments WHERE id = ?', [id]) as any;
  await syncAppointmentToVendorCalendar(created);
  res.status(201).json(await db.get('SELECT * FROM appointments WHERE id = ?', [id]));
});

app.put('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM appointments WHERE id = ?', [id]) as any;
  if (!existing) return res.status(404).json({ error: 'Non trovato' });

  const { leadName, colleague, assignedVendor, dateTime, title, notes, appointmentType, googleEventId, vendorGoogleEventId, visitStatus, visitCompletedAt, completed } = req.body;
  await db.run(`
    UPDATE appointments SET
      leadName=COALESCE(?,leadName), colleague=COALESCE(?,colleague), assignedVendor=COALESCE(?,assignedVendor),
      dateTime=COALESCE(?,dateTime), title=COALESCE(?,title), notes=COALESCE(?,notes),
      appointmentType=COALESCE(?,appointmentType),
      googleEventId=COALESCE(?,googleEventId), vendorGoogleEventId=COALESCE(?,vendorGoogleEventId),
      visitStatus=COALESCE(?,visitStatus), visitCompletedAt=COALESCE(?,visitCompletedAt),
      completed=COALESCE(?,completed)
    WHERE id=?
  `, [leadName, colleague, assignedVendor, dateTime, title, notes, appointmentType, googleEventId, vendorGoogleEventId, visitStatus, visitCompletedAt, completed !== undefined ? String(completed) : null, id]);

  // Reassigning to a different agent: drop the event from the previous agent's calendar first.
  const reassigned = assignedVendor && assignedVendor !== existing.assignedVendor;
  if (reassigned && existing.vendorGoogleEventId) {
    await deleteVendorCalendarEvent(existing);
    await db.run('UPDATE appointments SET vendorGoogleEventId = ? WHERE id = ?', ['', id]);
  }

  const updated = await db.get('SELECT * FROM appointments WHERE id = ?', [id]) as any;
  await syncAppointmentToVendorCalendar(updated);
  res.json(await db.get('SELECT * FROM appointments WHERE id = ?', [id]));
});

app.delete('/api/appointments/:id', async (req, res) => {
  const existing = await db.get('SELECT * FROM appointments WHERE id = ?', [req.params.id]) as any;
  await db.run('DELETE FROM appointments WHERE id = ?', [req.params.id]);
  if (existing) await deleteVendorCalendarEvent(existing);
  res.json({ ok: true });
});

// ── VISIT REPORTS ──
app.get('/api/visit-reports', async (req, res) => {
  const { vendorName, leadId } = req.query;
  let query = 'SELECT vr.* FROM visit_reports vr INNER JOIN leads l ON l.id = vr.leadId';
  let params: any[] = [];
  const conditions: string[] = [];

  if (vendorName) { conditions.push('LOWER(TRIM(vr.vendorName)) = LOWER(TRIM(?))'); params.push(vendorName); }
  if (leadId) { conditions.push('vr.leadId = ?'); params.push(leadId); }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY vr.visitDate DESC';
  res.json(await db.all(query, params));
});

app.post('/api/visit-reports', async (req, res) => {
  const {
    appointmentId, leadId, vendorName, visitDate,
    visitStatus='effettuato', clientType='residenziale', kwpSystem=0, hasHeatPump=false,
    outcome='', contractValue=0, notes='', nextAction='', roofType='', consumption=0,
    quoteStatus='nessuno', quoteDeliveryMethod='', quoteFileName='', quoteFileData='', quoteDeliveredAt=''
  } = req.body;

  if (!appointmentId || !leadId) return res.status(400).json({ error: 'appointmentId e leadId richiesti' });

  const id = randomUUID();
  const now = new Date().toISOString();
  const hpInt = hasHeatPump ? 1 : 0;

  await db.run(`
    INSERT INTO visit_reports (id, appointmentId, leadId, vendorName, visitDate, visitStatus, clientType, kwpSystem, hasHeatPump, outcome, contractValue, notes, nextAction, roofType, consumption, photos, quoteStatus, quoteDeliveryMethod, quoteFileName, quoteFileData, quoteDeliveredAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?)
  `, [id, appointmentId, leadId, vendorName, visitDate, visitStatus, clientType, kwpSystem, hpInt, outcome, contractValue, notes, nextAction, roofType, consumption, quoteStatus, quoteDeliveryMethod, quoteFileName, quoteFileData, quoteDeliveredAt, now, now]);

  const statusVal = visitStatus === 'effettuato' ? 'completed' : 'not_done';
  await db.run(`UPDATE appointments SET visitStatus=?, visitCompletedAt=? WHERE id=?`, [statusVal, now, appointmentId]);

  let newLeadStatus = 'Interessato';
  if (visitStatus === 'non_effettuato') {
    newLeadStatus = 'Da richiamare';
  } else if (outcome === 'contratto_firmato') {
    newLeadStatus = 'Chiuso con successo';
  } else if (outcome === 'non_interessato') {
    newLeadStatus = 'Non interessato';
  }

  // Update Lead quote status so Erika sees it at a glance
  await db.run(`
    UPDATE leads 
    SET status=?, quoteStatus=?, quoteDeliveryMethod=?, quoteFileName=?, quoteDeliveredAt=?, updatedAt=?
    WHERE id=?
  `, [newLeadStatus, quoteStatus, quoteDeliveryMethod, quoteFileName, quoteDeliveredAt || now, now, leadId]);

  const statusLabel = visitStatus === 'effettuato' ? '✓ SOPRALLUOGO EFFETTUATO' : '✗ SOPRALLUOGO NON EFFETTUATO';
  const typeLabel = clientType === 'azienda' ? '🏢 Azienda' : '🏠 Residenziale';
  const hpLabel = hasHeatPump ? ' | 🔥 Pompa di Calore: SÌ' : '';
  const noteSummary = `[Report Sopralluogo ${vendorName}] ${statusLabel} (${typeLabel} - ${kwpSystem} kWp${hpLabel}). ${notes ? `Note: ${notes}` : ''}`;

  await db.run(`
    INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
    VALUES (?, ?, ?, ?, ?, ?, 'visit_report')
  `, [randomUUID(), leadId, now, vendorName, noteSummary, newLeadStatus]);

  // If quote was delivered, add explicit history entry for Erika
  if (quoteStatus === 'consegnato') {
    const methodLabel = quoteDeliveryMethod === 'whatsapp' ? '📱 Inviato via WhatsApp' : quoteDeliveryMethod === 'cartaceo' ? '📄 Consegnato a Mano (Cartaceo)' : '📧 Inviato via Email';
    const quoteNote = `📄 [PREVENTIVO CONSEGNATO] Modalità: ${methodLabel}. ${quoteFileName ? `Allegato: ${quoteFileName}` : ''}`;
    await db.run(`
      INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type, attachmentName)
      VALUES (?, ?, ?, ?, ?, ?, 'quote', ?)
    `, [randomUUID(), leadId, now, vendorName, quoteNote, newLeadStatus, quoteFileName]);
  }

  // Trigger automatic post-visit email if visitStatus is 'effettuato'
  if (visitStatus === 'effettuato') {
    try {
      // SECURITY BLOCK: Check if post-visit email was ALREADY sent for this lead
      const alreadySent = await db.get(`
        SELECT id FROM history 
        WHERE leadId = ? AND note LIKE '%[EMAIL POST-SOPRALLUOGO INVIATA]%'
      `, [leadId]);

      if (alreadySent) {
        console.log(`[POST-VISIT EMAIL] Blocco sicurezza: email post-sopralluogo già inviata in precedenza per il lead ${leadId}. Invio duplicato annullato.`);
      } else {
        const targetLead = await db.get('SELECT * FROM leads WHERE id = ?', [leadId]) as any;
        if (targetLead && targetLead.email) {
          const postVisitTpl = await db.get("SELECT * FROM email_templates WHERE templateType = 'post_visit'", []) as any;
          if (postVisitTpl) {
            const finalSubject = postVisitTpl.subject
              .replace(/\{nome\}/g, targetLead.name)
              .replace(/\{azienda\}/g, targetLead.company || targetLead.name)
              .replace(/\{agente\}/g, vendorName || 'SolarBrand');

            const finalBody = postVisitTpl.body
              .replace(/\{nome\}/g, targetLead.name)
              .replace(/\{azienda\}/g, targetLead.company || targetLead.name)
              .replace(/\{agente\}/g, vendorName || 'SolarBrand');

            sendSystemEmail(targetLead.email, finalSubject, finalBody).then(async sent => {
              if (sent) {
                await db.run(`
                  INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
                  VALUES (?, ?, ?, ?, ?, ?, 'email')
                `, [randomUUID(), leadId, now, vendorName, `[EMAIL POST-SOPRALLUOGO INVIATA] Email di ringraziamento inviata a ${targetLead.email}`, newLeadStatus]);
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('Errore invio email post-sopralluogo:', e);
    }
  }

  res.status(201).json({ id, appointmentId, leadId, vendorName, visitDate, visitStatus, clientType, kwpSystem, hasHeatPump, outcome, contractValue, notes, quoteStatus, quoteDeliveryMethod, quoteFileName });
});

app.put('/api/visit-reports/:id', async (req, res) => {
  const { id } = req.params;
  const { visitStatus, clientType, kwpSystem, hasHeatPump, outcome, contractValue, notes, nextAction, roofType, consumption } = req.body;
  const now = new Date().toISOString();
  const hpInt = hasHeatPump !== undefined ? (hasHeatPump ? 1 : 0) : null;

  await db.run(`
    UPDATE visit_reports SET
      visitStatus=COALESCE(?,visitStatus), clientType=COALESCE(?,clientType),
      kwpSystem=COALESCE(?,kwpSystem), hasHeatPump=COALESCE(?,hasHeatPump),
      outcome=COALESCE(?,outcome), contractValue=COALESCE(?,contractValue),
      notes=COALESCE(?,notes), nextAction=COALESCE(?,nextAction),
      roofType=COALESCE(?,roofType), consumption=COALESCE(?,consumption), updatedAt=?
    WHERE id=?
  `, [visitStatus, clientType, kwpSystem, hpInt, outcome, contractValue, notes, nextAction, roofType, consumption, now, id]);

  res.json(await db.get('SELECT * FROM visit_reports WHERE id = ?', [id]));
});

// ── TASKS ──
app.get('/api/tasks', async (req, res) => {
  const { completed } = req.query;
  let stmt = 'SELECT * FROM tasks';
  const params: any[] = [];
  if (completed !== undefined) {
    stmt += ' WHERE completed = ?';
    params.push(String(completed));
  }
  stmt += ' ORDER BY dueDate ASC';
  res.json(await db.all(stmt, params));
});

app.post('/api/tasks', async (req, res) => {
  const { leadId, leadName='', createdBy='', assignedTo='', description='', dueDate='', googleEventId='', appointmentId='' } = req.body;
  if (!leadId) return res.status(400).json({ error: 'leadId richiesto' });
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.run(`
    INSERT INTO tasks (id, leadId, leadName, createdBy, assignedTo, description, dueDate, completed, createdAt, googleEventId, appointmentId)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'false', ?, ?, ?)
  `, [id, leadId, leadName, createdBy, assignedTo, description, dueDate, now, googleEventId, appointmentId]);
  res.status(201).json({ id, leadId, leadName, createdBy, assignedTo, description, dueDate, completed: false, createdAt: now, googleEventId, appointmentId });
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM tasks WHERE id = ?', [id]) as any;
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  const { assignedTo, description, dueDate, completed, googleEventId } = req.body;
  await db.run(`
    UPDATE tasks SET
      assignedTo=COALESCE(?,assignedTo), description=COALESCE(?,description), dueDate=COALESCE(?,dueDate),
      completed=COALESCE(?,completed), googleEventId=COALESCE(?,googleEventId)
    WHERE id=?
  `, [assignedTo, description, dueDate, completed !== undefined ? String(completed) : null, googleEventId, id]);
  res.json(await db.get('SELECT * FROM tasks WHERE id = ?', [id]));
});

app.delete('/api/tasks/:id', async (req, res) => {
  await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── TEMPLATES & SMTP ──
app.get('/api/email-templates', async (req, res) => {
  res.json(await db.all('SELECT * FROM email_templates ORDER BY name ASC', []));
});

app.post('/api/email-templates', async (req, res) => {
  const { name, subject='', body='' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name richiesto' });
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.run('INSERT INTO email_templates (id, name, subject, body, createdAt) VALUES (?, ?, ?, ?, ?)', [id, name, subject, body, now]);
  res.status(201).json({ id, name, subject, body, createdAt: now });
});

app.put('/api/email-templates/:id', async (req, res) => {
  const { id } = req.params;
  const { name, subject, body } = req.body;
  await db.run('UPDATE email_templates SET name=COALESCE(?,name), subject=COALESCE(?,subject), body=COALESCE(?,body) WHERE id=?', [name, subject, body, id]);
  res.json(await db.get('SELECT * FROM email_templates WHERE id = ?', [id]));
});

app.delete('/api/email-templates/:id', async (req, res) => {
  await db.run('DELETE FROM email_templates WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/sms-templates', async (req, res) => {
  res.json(await db.all('SELECT * FROM sms_templates ORDER BY name ASC', []));
});

app.post('/api/sms-templates', async (req, res) => {
  const { name, body='' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name richiesto' });
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.run('INSERT INTO sms_templates (id, name, body, createdAt) VALUES (?, ?, ?, ?)', [id, name, body, now]);
  res.status(201).json({ id, name, body, createdAt: now });
});

app.put('/api/sms-templates/:id', async (req, res) => {
  const { id } = req.params;
  const { name, body } = req.body;
  await db.run('UPDATE sms_templates SET name=COALESCE(?,name), body=COALESCE(?,body) WHERE id=?', [name, body, id]);
  res.json(await db.get('SELECT * FROM sms_templates WHERE id = ?', [id]));
});

app.delete('/api/sms-templates/:id', async (req, res) => {
  await db.run('DELETE FROM sms_templates WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/smtp-accounts', async (req, res) => {
  res.json(await db.all('SELECT * FROM smtp_accounts ORDER BY name ASC', []));
});

app.post('/api/smtp-accounts', async (req, res) => {
  const { name, host='', port='587', user_email='', pass='' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name richiesto' });
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.run('INSERT INTO smtp_accounts (id, name, host, port, user_email, pass, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, host, port, user_email, pass, now]);
  res.status(201).json({ id, name, host, port, user_email, pass, createdAt: now });
});

app.put('/api/smtp-accounts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, host, port, user_email, pass } = req.body;
  await db.run('UPDATE smtp_accounts SET name=COALESCE(?,name), host=COALESCE(?,host), port=COALESCE(?,port), user_email=COALESCE(?,user_email), pass=COALESCE(?,pass) WHERE id=?', [name, host, port, user_email, pass, id]);
  res.json(await db.get('SELECT * FROM smtp_accounts WHERE id = ?', [id]));
});

app.delete('/api/smtp-accounts/:id', async (req, res) => {
  await db.run('DELETE FROM smtp_accounts WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, to, subject, body, attachments } = req.body;
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !to || !subject || !body) {
      return res.status(400).json({ error: 'Campi mancanti' });
    }
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    const info = await transporter.sendMail({
      from: smtpUser,
      to,
      subject,
      html: body,
      attachments: (attachments || []).map((a: any) => a.path
        ? { filename: a.filename, path: a.path }
        : { filename: a.filename, content: a.content, encoding: 'base64' }
      ),
    });
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Errore sconosciuto' });
  }
});

// ── AUTH & LOGIN ──
app.get('/api/config', async (req, res) => {
  res.json({ demoMode: DEMO_MODE, googleCalendarConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Email e password richieste' });

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = String(password).trim();

  // Find colleague by email, username, id or name (case-insensitive)
  const colleague = await db.get(`
    SELECT * FROM colleagues 
    WHERE LOWER(TRIM(email)) = ? 
       OR LOWER(TRIM(username)) = ? 
       OR LOWER(TRIM(id)) = ? 
       OR LOWER(TRIM(name)) = ?
  `, [cleanEmail, cleanEmail, cleanEmail, cleanEmail]) as any;

  if (!colleague) {
    return res.json({ ok: false, error: 'Account o email non trovati' });
  }

  // Verify password with scrypt or allow default master password SolarBrand2026!
  let isValid = false;
  if (colleague.passwordHash && colleague.passwordHash.startsWith('scrypt$')) {
    isValid = verifyPassword(cleanPass, colleague.passwordHash);
  }
  
  if (!isValid && cleanPass === 'SolarBrand2026!') {
    isValid = true;
    // Auto-update password hash to proper scrypt
    await db.run('UPDATE colleagues SET passwordHash = ? WHERE id = ?', [hashPassword(cleanPass), colleague.id]);
  }

  if (!isValid) {
    return res.json({ ok: false, error: 'Password non corretta' });
  }

  const token = await createSession(colleague.id);
  res.json({ ok: true, token, id: colleague.id, name: colleague.name, role: colleague.role || 'telefonista' });
});

// Demo-only: pick a profile with one click, no password. Fully disabled
// server-side (regardless of what the frontend shows) once DEMO_MODE=false.
app.get('/api/auth/demo-colleagues', async (req, res) => {
  if (!DEMO_MODE) return res.status(403).json({ error: 'Modalità demo disattivata' });
  res.json(await db.all('SELECT id, name, role FROM colleagues ORDER BY name ASC', []));
});

app.post('/api/auth/demo-login', async (req, res) => {
  if (!DEMO_MODE) return res.status(403).json({ ok: false, error: 'Modalità demo disattivata' });
  const { id } = req.body;
  const colleague = await db.get('SELECT * FROM colleagues WHERE id = ?', [id]) as any;
  if (!colleague) return res.json({ ok: false, error: 'Utente non trovato' });

  const token = await createSession(colleague.id);
  res.json({ ok: true, token, id: colleague.id, name: colleague.name, role: colleague.role || 'telefonista' });
});

app.post('/api/auth/logout', async (req, res) => {
  const { token } = req.body;
  if (token) await db.run('DELETE FROM sessions WHERE token = ?', [token]);
  res.json({ ok: true });
});

app.post('/api/auth/set-password', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { id, password } = req.body;
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
  }

  await db.run('UPDATE colleagues SET passwordHash = ? WHERE id = ?', [hashPassword(String(password)), id]);
  // Setting a new password invalidates any previously issued sessions for this account.
  await db.run('DELETE FROM sessions WHERE colleagueId = ?', [id]);
  res.json({ ok: true });
});

app.post('/api/auth/check-password', async (req, res) => {
  const { password, level } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ariete2016**';
  const OPERATOR_SECRET = process.env.OPERATOR_SECRET || 'Ariete2016**';
  if (level === 'admin') {
    return res.json({ ok: password === ADMIN_PASSWORD });
  }
  if (level === 'operator') {
    return res.json({ ok: password === OPERATOR_SECRET });
  }
  return res.status(400).json({ error: 'level non valido' });
});

// ── GOOGLE CALENDAR PER-AGENTE ──
// Each agent connects their OWN Google account; the token is stored on their
// colleague row and used only to sync appointments assigned to them. This is
// independent from whichever telefonista created the appointment.
app.get('/api/auth/google/start', async (req, res) => {
  const { vendorId, token } = req.query as { vendorId?: string; token?: string };
  if (!vendorId) return res.status(400).send('vendorId richiesto');
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).send('Integrazione Google Calendar non configurata sul server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET mancanti nel file .env).');
  }

  const session = token ? (await db.get('SELECT * FROM sessions WHERE token = ?', [token]) as any) : null;
  if (!session || new Date(session.expiresAt) < new Date()) {
    return res.status(401).send('Sessione non valida: effettua di nuovo il login e riprova a collegare Google Calendar.');
  }
  const requester = await db.get('SELECT * FROM colleagues WHERE id = ?', [session.colleagueId]) as any;
  if (!requester || (requester.id !== vendorId && requester.role !== 'admin')) {
    return res.status(403).send('Non sei autorizzato a collegare il Google Calendar di questo profilo.');
  }

  const state = randomBytes(24).toString('hex');
  await db.run('INSERT INTO oauth_states (state, vendorId, createdAt) VALUES (?, ?, ?)', [state, vendorId, new Date().toISOString()]);

  const url = getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state,
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
  if (error) {
    return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h3>Autorizzazione annullata.</h3><p>Puoi chiudere questa finestra.</p></body></html>');
  }
  if (!code || !state) return res.status(400).send('Parametri mancanti nella risposta di Google.');

  const stateRow = await db.get('SELECT * FROM oauth_states WHERE state = ?', [state]) as any;
  if (!stateRow) return res.status(400).send('Richiesta scaduta o non valida. Torna nell\'app e riprova a collegare Google Calendar.');
  await db.run('DELETE FROM oauth_states WHERE state = ?', [state]);

  try {
    const { tokens } = await getOAuthClient().getToken(code);
    await db.run('UPDATE colleagues SET googleTokens = ? WHERE id = ?', [JSON.stringify(tokens), stateRow.vendorId]);
    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>&#9989; Google Calendar collegato con successo!</h2><p>Da questo momento i tuoi appuntamenti verranno sincronizzati automaticamente. Puoi chiudere questa finestra.</p></body></html>');
  } catch (e) {
    console.error('[google oauth callback]', e);
    res.status(500).send('Si è verificato un errore durante il collegamento con Google Calendar.');
  }
});

app.post('/api/auth/google/disconnect', async (req, res) => {
  const { vendorId } = req.body;
  if (!vendorId) return res.status(400).json({ error: 'vendorId richiesto' });
  await db.run('UPDATE colleagues SET googleTokens = ? WHERE id = ?', ['', vendorId]);
  res.json({ ok: true });
});

async function syncAppointmentToVendorCalendar(appointment: any) {
  if (!appointment?.assignedVendor) return;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return;

  const vendor = await db.get('SELECT * FROM colleagues WHERE name = ? AND role = ?', [appointment.assignedVendor, 'venditore']) as any;
  if (!vendor?.googleTokens) return;

  try {
    const tokens = JSON.parse(vendor.googleTokens);
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(tokens);
    oauth2Client.on('tokens', async (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      await db.run('UPDATE colleagues SET googleTokens = ? WHERE id = ?', [JSON.stringify(merged), vendor.id]);
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [appointment.leadId]) as any;

    const startDate = new Date(appointment.dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60000);
    const descriptionLines = [
      appointment.notes || '',
      lead?.phone ? `Telefono cliente: ${lead.phone}` : '',
      lead?.address ? `Indirizzo: ${lead.address}` : '',
      appointment.colleague ? `Appuntamento fissato da: ${appointment.colleague}` : '',
    ].filter(Boolean);

    const eventBody = {
      summary: appointment.title || `Appuntamento - ${appointment.leadName || 'Cliente'}`,
      description: descriptionLines.join('\n'),
      location: lead?.address || '',
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
    };

    if (appointment.vendorGoogleEventId) {
      await calendar.events.update({ calendarId: 'primary', eventId: appointment.vendorGoogleEventId, requestBody: eventBody });
    } else {
      const created = await calendar.events.insert({ calendarId: 'primary', requestBody: eventBody });
      await db.run('UPDATE appointments SET vendorGoogleEventId = ? WHERE id = ?', [created.data.id, appointment.id]);
    }
  } catch (e) {
    console.error(`[google-calendar-sync] Errore sincronizzazione per l'agente ${appointment.assignedVendor}:`, e);
  }
}

async function deleteVendorCalendarEvent(appointment: any) {
  if (!appointment?.vendorGoogleEventId || !appointment?.assignedVendor) return;
  const vendor = await db.get('SELECT * FROM colleagues WHERE name = ?', [appointment.assignedVendor]) as any;
  if (!vendor?.googleTokens) return;

  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(JSON.parse(vendor.googleTokens));
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.delete({ calendarId: 'primary', eventId: appointment.vendorGoogleEventId });
  } catch (e) {
    console.error('[google-calendar-sync] Errore eliminazione evento dal calendario agente:', e);
  }
}

app.get('/api/settings', async (req, res) => {
  const rows = await db.all('SELECT * FROM settings', []) as any[];
  const settings: Record<string, string> = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;
  await db.run('REPLACE INTO settings (`key`, value) VALUES (?, ?)', [key, value]);
  res.json({ ok: true });
});

// ── IMPORT LEADS (CSV / Excel) ──
app.post('/api/leads/import', async (req, res) => {
  try {
    const { leads: rawLeads, duplicate_mode = 'skip' } = req.body || {};
    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return res.status(400).json({ error: 'Array leads vuoto' });
    }

    let imported = 0, updated = 0, skipped = 0, failed = 0;
    const results: any[] = [];
    const importedIds: string[] = [];
    const updatedIds: string[] = [];

    for (let i = 0; i < rawLeads.length; i++) {
      try {
        const raw = rawLeads[i] || {};
        const name = String(raw.name ?? raw.nome ?? raw.full_name ?? '').trim();
        const phone = String(raw.phone ?? raw.telefono ?? raw.tel ?? '').trim();
        const email = String(raw.email ?? '').toLowerCase().trim();
        const company = String(raw.company ?? raw.azienda ?? '').trim();
        const notes = String(raw.notes ?? raw.note ?? '').trim();
        const address = String(raw.address ?? raw.indirizzo ?? raw.via ?? '').trim();
        const assignedColleague = String(raw.assignedColleague ?? raw.operatore ?? raw.venditore ?? raw.agente ?? raw.assegnato ?? '').trim();
        const assignedTelefonista = String(raw.assignedTelefonista ?? raw.telefonista ?? '').trim();
        let assignedTelefonisti: string[] = [];
        if (Array.isArray(raw.assignedTelefonisti)) {
          assignedTelefonisti = raw.assignedTelefonisti.map((t: any) => String(t).trim()).filter(Boolean);
        } else if (assignedTelefonista) {
          assignedTelefonisti = [assignedTelefonista];
        }

        const service = String(raw.service ?? raw.servizio ?? raw.tipologia ?? '').trim();
        const services = Array.isArray(raw.services) && raw.services.length > 0
          ? raw.services.map((s: any) => String(s).trim()).filter(Boolean)
          : (service ? [service] : []);

        if (!name) { failed++; results.push({ ok: false, row: i+1, error: 'name mancante' }); continue; }

        const conditions: string[] = [];
        const params: any[] = [];
        if (email) { conditions.push('LOWER(email) = ?'); params.push(email); }
        if (phone) { conditions.push("REPLACE(phone, ' ', '') LIKE ?"); params.push(`%${phone.replace(/\s/g,'').replace(/^\+39/,'')}%`); }

        let duplicate = null;
        if (conditions.length > 0) {
          duplicate = await db.get(`SELECT * FROM leads WHERE ${conditions.join(' OR ')} LIMIT 1`, params) as any;
        }

        if (duplicate) {
          if (duplicate_mode === 'skip') {
            const matchedOn = email && String(duplicate.email || '').toLowerCase() === email ? 'email' : 'telefono';
            skipped++;
            results.push({ ok: false, row: i+1, duplicate: true, existingName: duplicate.name, matchedOn });
            continue;
          }
          if (duplicate_mode === 'use_existing') {
            const now = new Date().toISOString();
            const newAssignedColleague = assignedColleague || duplicate.assignedColleague || '';
            const existingTel = parseJsonField(duplicate.assignedTelefonisti) || [];
            const newTelefonisti = assignedTelefonisti.length > 0 ? assignedTelefonisti : existingTel;
            const newServices = services.length > 0 ? services : (parseJsonField(duplicate.services) || (duplicate.service ? [duplicate.service] : []));
            const newService = service || duplicate.service || (newServices[0] || '');

            await db.run('UPDATE leads SET name=?, company=?, phone=?, email=?, service=?, services=?, assignedColleague=?, assignedTelefonisti=?, status=?, address=?, updatedAt=? WHERE id=?', [
              name,
              company || duplicate.company,
              phone || duplicate.phone,
              email || duplicate.email,
              newService,
              JSON.stringify(newServices),
              newAssignedColleague,
              JSON.stringify(newTelefonisti),
              'Nuovo',
              address || duplicate.address,
              now,
              duplicate.id
            ]);
            updated++;
            if (email) updatedIds.push(duplicate.id);
            results.push({ ok: true, row: i+1, updated: true }); continue;
          }
        }

        const id = randomUUID();
        const now = new Date().toISOString();
        await db.run(`
          INSERT INTO leads (id, name, company, phone, email, status, type, service, services, assignedColleague, assignedTelefonisti, source, notes, address, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, 'Nuovo', 'Lead', ?, ?, ?, ?, 'csv', ?, ?, ?, ?)
        `, [id, name, company, phone, email, service, JSON.stringify(services), assignedColleague, JSON.stringify(assignedTelefonisti), notes, address, now, now]);

        if (notes) {
          await db.run('INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [randomUUID(), id, now, 'Importazione', notes, 'Nuovo', 'note']);
        }

        imported++;
        if (email) importedIds.push(id);
        results.push({ ok: true, row: i+1 });
      } catch (rowErr: any) {
        console.error(`[leads/import] riga ${i+1}:`, rowErr);
        failed++; results.push({ ok: false, row: i+1, error: rowErr.message });
      }
    }

    // importedIds = new + updated IDs that have email (for newsletter pre-selection)
    const allImportedIds = [...importedIds, ...updatedIds];
    res.status(201).json({ ok: true, imported, updated, skipped, failed, total: rawLeads.length, results, importedIds: allImportedIds });
  } catch (error: any) {
    console.error('[leads/import]:', error);
    res.status(500).json({ error: 'Errore interno durante l\'importazione: ' + (error?.message || 'sconosciuto') });
  }
});

// ── GOOGLE MAPS / APIFY LEAD SCRAPER ──
app.post('/api/leads/apify-search', async (req, res) => {
  try {
    const { industries, locations, fetch_count = 20, keywords, cities, wantsVerifiedEmail = true, assignedColleague = '', assignedTelefonista = '', service = '', duplicateMode = 'skip' } = req.body || {};

    const settingRow = await db.get("SELECT value FROM settings WHERE `key` IN ('apify_token', 'apify_api_key') ORDER BY CASE `key` WHEN 'apify_token' THEN 0 ELSE 1 END LIMIT 1", []) as any;
    const apifyToken = (settingRow?.value || process.env.APIFY_TOKEN || process.env.APIFY_API_KEY || '').trim();

    if (!apifyToken) {
      return res.status(400).json({ error: 'Token API Apify non configurato. Salvalo prima nelle impostazioni di ricerca.' });
    }

    const searchStrings = buildSearchStrings(industries, keywords);
    if (searchStrings.length === 0) {
      return res.status(400).json({ error: 'Inserisci almeno un settore o categoria di attività da cercare.' });
    }

    const locationQuery = buildLocationQuery(locations, cities);
    const targetCount = Math.max(1, Math.min(Number(fetch_count) || 20, 200));
    // Su Google Maps circa il 25-35% delle attività possiede email e telefono estratti dal sito.
    // Per garantire l'esatto numero target richiesto, scansioniamo 3.5x - 4x schede iniziali.
    const initialBatchSize = Math.max(25, Math.ceil((targetCount * 3.5) / searchStrings.length));

    const actorInput = buildActorInput(searchStrings, locationQuery, initialBatchSize, Boolean(wantsVerifiedEmail));
    const started = await startApifyRun(apifyToken, actorInput);

    if ('error' in started) {
      return res.status(502).json({ error: started.error });
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
      wantsVerifiedEmail: Boolean(wantsVerifiedEmail),
      currentApifyRunId: started.runId,
      currentBatchSize: initialBatchSize,
      roundsDone: 0,
      collectedLeads: [],
      assignedColleague: assignedColleague ? String(assignedColleague).trim() : '',
      assignedTelefonista: assignedTelefonista ? String(assignedTelefonista).trim() : '',
      customService: service ? String(service).trim() : '',
      duplicateMode: (['skip', 'use_existing', 'create_new'].includes(duplicateMode) ? duplicateMode : 'skip') as any,
    });

    res.json({ ok: true, runId: jobId, status: started.status });
  } catch (error: any) {
    console.error('[apify-search start]:', error);
    res.status(500).json({ error: 'Errore durante l\'avvio dello scraper Apify: ' + (error?.message || 'sconosciuto') });
  }
});

app.get('/api/leads/apify-search/status', async (req, res) => {
  try {
    const runId = String(req.query.runId || '');
    const job = getJob(runId);
    if (!job) {
      return res.status(404).json({ error: 'Job di ricerca non trovato o scaduto' });
    }

    if (job.result) {
      return res.json(job.result);
    }

    // Check Run Status on Apify
    const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${job.currentApifyRunId}?token=${encodeURIComponent(job.apifyToken)}`);
    if (!runRes.ok) {
      return res.json({ status: 'RUNNING', message: 'In attesa di risposta da Apify...' });
    }

    const runData = await runRes.json();
    const apifyStatus = runData?.data?.status;

    if (apifyStatus === 'READY' || apifyStatus === 'RUNNING') {
      return res.json({
        status: 'RUNNING',
        foundSoFar: job.collectedLeads.length,
        roundsDone: job.roundsDone,
        message: `Scansione Google Maps e arricchimento in corso (${job.collectedLeads.length}/${job.targetCount} lead completi con Email e Telefono)...`,
      });
    }

    if (apifyStatus !== 'SUCCEEDED') {
      job.result = {
        status: 'FAILED',
        ok: false,
        error: `La scansione su Apify si è conclusa con stato: ${apifyStatus || 'SCONOSCIUTO'}`,
      };
      return res.json(job.result);
    }

    // Download dataset
    const datasetId = runData.data.defaultDatasetId;
    const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(job.apifyToken)}`);
    if (!itemsRes.ok) {
      job.result = { status: 'FAILED', ok: false, error: 'Impossibile scaricare i dati estratti da Apify' };
      return res.json(job.result);
    }

    const rawItems = await itemsRes.json();
    const { leads, placesScanned } = parseGoogleMapsItems(rawItems);

    // Merge into collected leads (avoiding duplicates within job)
    const existingKeys = new Set(job.collectedLeads.map(l => `${l.email.toLowerCase()}|${l.phone}|${l.company.toLowerCase()}`));
    for (const lead of leads) {
      const key = `${lead.email.toLowerCase()}|${lead.phone}|${lead.company.toLowerCase()}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        job.collectedLeads.push(lead);
      }
    }

    // Multi-round check: se non abbiamo ancora raggiunto il target esatto di lead qualificati (email + tel), lanciamo un round aggiuntivo
    if (
      job.collectedLeads.length < job.targetCount &&
      job.roundsDone < 3
    ) {
      const remaining = job.targetCount - job.collectedLeads.length;
      const newBatchSize = Math.max(Math.ceil(job.currentBatchSize * 1.5), Math.ceil((remaining * 4) / job.searchStrings.length));
      const actorInput = buildActorInput(job.searchStrings, job.locationQuery, newBatchSize, job.wantsVerifiedEmail);
      const newRun = await startApifyRun(job.apifyToken, actorInput);

      if (!('error' in newRun)) {
        updateJob(runId, {
          currentApifyRunId: newRun.runId,
          currentBatchSize: newBatchSize,
          roundsDone: job.roundsDone + 1,
        });
        return res.json({
          status: 'RUNNING',
          foundSoFar: job.collectedLeads.length,
          roundsDone: job.roundsDone + 1,
          message: `Trovati finora ${job.collectedLeads.length}/${job.targetCount} lead completi (Email + Tel). Ricerca automatica dei rimanenti ${remaining} contatti in corso (Round ${job.roundsDone + 2})...`,
        });
      }
    }

    // Save final leads into database
    const finalLeads = job.collectedLeads.slice(0, job.targetCount);
    const now = new Date().toISOString();
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const importedIds: string[] = [];
    const duplicatesList: { row: number; existingName?: string; matchedOn?: string }[] = [];
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

      // Check if lead already exists in DB by email or phone
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
          const matchedOn = email && String(duplicate.email || '').toLowerCase() === email ? 'email' : 'telefono';
          skippedCount++;
          duplicatesList.push({ row: i + 1, existingName: duplicate.name, matchedOn });
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
              name || duplicate.name,
              company || duplicate.company,
              phone || duplicate.phone,
              email || duplicate.email,
              newService,
              JSON.stringify(newServices),
              newColleague,
              JSON.stringify(newTelefonisti),
              'Nuovo',
              address || duplicate.address,
              now,
              duplicate.id
            ]);

            updatedCount++;
            if (email) importedIds.push(duplicate.id);
          } catch (updateErr) {
            console.error('[apify lead update error]:', updateErr);
          }
          continue;
        }
      }

      // Nuova creazione (o duplicato con create_new)
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
        `, [randomUUID(), id, now, 'Google Maps Scraper', `[IMPORTAZIONE GOOGLE MAPS] Azienda: ${company}${role ? ` | Referente: ${name} (${role})` : ''}`, 'Nuovo']);

        importedCount++;
        if (email) importedIds.push(id);
      } catch (dbErr) {
        console.error('[apify lead save error]:', dbErr);
      }
    }

    job.result = {
      status: 'DONE',
      ok: true,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      duplicates: duplicatesList,
      total: finalLeads.length,
      importedIds,
    };

    return res.json(job.result);
  } catch (error: any) {
    console.error('[apify-search status]:', error);
    res.status(500).json({ error: 'Errore durante la verifica dello stato di Apify: ' + (error?.message || 'sconosciuto') });
  }
});

// ── LEAD ATTACHMENTS ──
app.get('/api/leads/:leadId/attachments', async (req, res) => {
  const { leadId } = req.params;
  const items = await db.all('SELECT * FROM lead_attachments WHERE leadId = ? ORDER BY createdAt DESC', [leadId]);
  res.json(items);
});

app.post('/api/leads/:leadId/attachments', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { description, fileName, fileSize, mimeType, uploadedBy, fileData } = req.body || {};

    if (!description || !fileName || !fileData || !uploadedBy) {
      return res.status(400).json({ error: 'Descrizione, nome file, dati ed utente sono obbligatori' });
    }
    if (/[\\/]|\.\./.test(leadId)) {
      return res.status(400).json({ error: 'ID lead non valido' });
    }

    const lead = await db.get('SELECT id FROM leads WHERE id = ?', [leadId]);
    if (!lead) return res.status(404).json({ error: 'Lead non trovato' });

    const id = randomUUID();
    const now = new Date().toISOString();

    // Save physical file in data/uploads/<leadId>/
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads', leadId);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeFileName = `${id}_${fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const diskPath = path.join(uploadsDir, safeFileName);

    // Extract base64 buffer and write to disk
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(diskPath, buffer);

    const relativePath = path.join('data', 'uploads', leadId, safeFileName);
    const actualSize = fileSize || buffer.length;

    await db.run(`
      INSERT INTO lead_attachments (id, leadId, description, fileName, filePath, fileSize, mimeType, uploadedBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, leadId, description.trim(), fileName, relativePath, actualSize, mimeType || 'application/octet-stream', uploadedBy, now]);

    // Add history record for lead history tab
    await db.run(`
      INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type, attachmentName)
      VALUES (?, ?, ?, ?, ?, '', 'attachment', ?)
    `, [randomUUID(), leadId, now, uploadedBy, `[DOCUMENTO ALLEGATO] ${description.trim()} (${fileName})`, fileName]);

    const item = await db.get('SELECT * FROM lead_attachments WHERE id = ?', [id]);
    res.status(201).json(item);
  } catch (error: any) {
    console.error('[leads/attachments]:', error);
    res.status(500).json({ error: 'Errore durante il salvataggio dell\'allegato: ' + (error?.message || 'sconosciuto') });
  }
});

app.get('/api/attachments/:id/download', async (req, res) => {
  const { id } = req.params;
  const att = await db.get('SELECT * FROM lead_attachments WHERE id = ?', [id]) as any;
  if (!att) return res.status(404).json({ error: 'Allegato non trovato' });

  const absolutePath = path.join(process.cwd(), att.filePath);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'File fisico non trovato sul server' });
  }

  res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(att.fileName)}"`);
  res.sendFile(absolutePath);
});

app.delete('/api/attachments/:id', async (req, res) => {
  const { id } = req.params;
  const att = await db.get('SELECT * FROM lead_attachments WHERE id = ?', [id]) as any;
  if (!att) return res.status(404).json({ error: 'Allegato non trovato' });

  // Delete physical file from disk if exists
  const absolutePath = path.join(process.cwd(), att.filePath);
  if (fs.existsSync(absolutePath)) {
    try { fs.unlinkSync(absolutePath); } catch (e) {}
  }

  await db.run('DELETE FROM lead_attachments WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ── REVIEWS & RATING ──
app.get('/recensione', async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:50px;color:#ef4444;">Link non valido</h2>');
  }

  const rev = await db.get('SELECT * FROM reviews WHERE token = ?', [token]) as any;
  if (!rev) {
    return res.status(404).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:50px;color:#ef4444;">Link di recensione non trovato o scaduto.</h2>');
  }

  if (rev.usedAt) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Recensione Già Registrata - SolarBrand</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
        <div class="max-w-md w-full bg-slate-800 border border-slate-700/60 rounded-3xl p-8 text-center space-y-4">
          <div class="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl font-black">★</div>
          <h2 class="text-xl font-bold text-white">Recensione già inviata</h2>
          <p class="text-sm text-slate-400">Hai già inviato la tua valutazione per il consulente <strong>${rev.vendorName}</strong>. Ti ringraziamo ancora per il tuo tempo!</p>
        </div>
      </body>
      </html>
    `);
  }

  const vendorName = rev.vendorName || 'SolarBrand';

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Valuta la tua esperienza - SolarBrand</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .star { cursor: pointer; transition: all 0.15s ease-in-out; }
    .star:hover, .star.active { color: #f59e0b; transform: scale(1.15); }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-800 border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
    <div class="space-y-2">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mb-2 border border-amber-500/20">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
      </div>
      <h1 class="text-2xl font-extrabold tracking-tight text-white">Valuta la tua esperienza</h1>
      <p class="text-sm text-slate-400">Come valuti il supporto del nostro consulente <strong class="text-amber-400">${vendorName}</strong>?</p>
    </div>

    <div id="formContainer" class="space-y-6">
      <div class="flex justify-center items-center gap-2 py-2" id="starsContainer">
        <button type="button" data-value="1" class="star text-slate-600 text-4xl focus:outline-none">★</button>
        <button type="button" data-value="2" class="star text-slate-600 text-4xl focus:outline-none">★</button>
        <button type="button" data-value="3" class="star text-slate-600 text-4xl focus:outline-none">★</button>
        <button type="button" data-value="4" class="star text-slate-600 text-4xl focus:outline-none">★</button>
        <button type="button" data-value="5" class="star text-slate-600 text-4xl focus:outline-none">★</button>
      </div>
      <p id="ratingLabel" class="text-xs font-bold text-amber-400 tracking-wider uppercase h-4">Seleziona una valutazione</p>

      <div class="text-left space-y-1">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block">Lascia un commento (opzionale)</label>
        <textarea id="comment" rows="3" placeholder="Scrivi qui cosa ne pensi della consulenza..." class="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"></textarea>
      </div>

      <button id="submitBtn" disabled class="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-extrabold py-3.5 px-6 rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/20">
        Invia la tua recensione
      </button>
    </div>

    <div id="successMsg" class="hidden space-y-4 py-6">
      <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-black">✓</div>
      <h2 class="text-xl font-bold text-white">Grazie per la tua recensione!</h2>
      <p class="text-sm text-slate-400">La tua opinione è stata registrata con successo e ci aiuta a migliorare costantemente il nostro servizio.</p>
    </div>
  </div>

  <script>
    const token = "${token}";
    let selectedRating = 0;
    const labels = ["", "Scarso 😞", "Sufficiente 😐", "Buono 🙂", "Molto Buono 😀", "Eccellente! 🌟"];
    const stars = document.querySelectorAll(".star");
    const ratingLabel = document.getElementById("ratingLabel");
    const submitBtn = document.getElementById("submitBtn");

    stars.forEach((star, index) => {
      star.addEventListener("click", () => {
        selectedRating = index + 1;
        updateStars();
        ratingLabel.textContent = labels[selectedRating];
        submitBtn.disabled = false;
      });
      star.addEventListener("mouseenter", () => {
        highlightStars(index + 1);
      });
    });

    document.getElementById("starsContainer").addEventListener("mouseleave", () => {
      updateStars();
    });

    function highlightStars(count) {
      stars.forEach((s, idx) => {
        if (idx < count) {
          s.classList.add("text-amber-400");
          s.classList.remove("text-slate-600");
        } else {
          s.classList.remove("text-amber-400");
          s.classList.add("text-slate-600");
        }
      });
    }

    function updateStars() {
      highlightStars(selectedRating);
    }

    submitBtn.addEventListener("click", async () => {
      if (!selectedRating) return;
      submitBtn.disabled = true;
      submitBtn.textContent = "Invio in corso...";
      try {
        const res = await fetch("/api/reviews/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            rating: selectedRating,
            comment: document.getElementById("comment").value.trim()
          })
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById("formContainer").classList.add("hidden");
          document.getElementById("successMsg").classList.remove("hidden");
        } else {
          alert(data.error || "Errore durante l'invio");
          submitBtn.disabled = false;
          submitBtn.textContent = "Invia la tua recensione";
        }
      } catch (e) {
        alert("Errore di connessione");
        submitBtn.disabled = false;
        submitBtn.textContent = "Invia la tua recensione";
      }
    });
  </script>
</body>
</html>`;

  res.send(html);
});

app.post('/api/reviews/submit', async (req, res) => {
  const { token, rating, comment = '' } = req.body;
  if (!token || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Dati non validi' });
  }

  const rev = await db.get('SELECT * FROM reviews WHERE token = ?', [token]) as any;
  if (!rev) {
    return res.status(404).json({ error: 'Recensione non trovata' });
  }

  if (rev.usedAt) {
    return res.status(400).json({ error: 'Recensione già inviata per questo link' });
  }

  const now = new Date().toISOString();
  await db.run(`
    UPDATE reviews
    SET rating = ?, comment = ?, usedAt = ?
    WHERE token = ?
  `, [Number(rating), String(comment), now, token]);

  if (rev.vendorName) {
    const stats = await db.get('SELECT AVG(rating) as avgR, COUNT(*) as cnt FROM reviews WHERE vendorName = ? AND usedAt != ""', [rev.vendorName]) as any;
    const avgRating = stats?.avgR ? Math.round(Number(stats.avgR) * 10) / 10 : 0;
    const reviewCount = stats?.cnt || 0;

    await db.run('UPDATE colleagues SET avgRating = ?, reviewCount = ? WHERE name = ?', [avgRating, reviewCount, rev.vendorName]);
  }

  res.json({ ok: true });
});

// GET all reviews (admin only)
app.get('/api/admin/reviews', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const reviews = await db.all(`
    SELECT r.*, 
           COALESCE(NULLIF(r.leadName, ''), l.name, 'Cliente rimosso') as leadName,
           COALESCE(NULLIF(r.leadEmail, ''), l.email, '') as leadEmail
    FROM reviews r
    LEFT JOIN leads l ON l.id = r.leadId
    ORDER BY r.createdAt DESC
  `, []) as any[];
  res.json(reviews);
});

// DELETE a review (admin only)
app.delete('/api/admin/reviews/:id', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { id } = req.params;
  const rev = await db.get('SELECT * FROM reviews WHERE id = ?', [id]) as any;
  if (!rev) return res.status(404).json({ error: 'Recensione non trovata' });

  await db.run('DELETE FROM reviews WHERE id = ?', [id]);

  if (rev.vendorName) {
    const stats = await db.get('SELECT AVG(rating) as avgR, COUNT(*) as cnt FROM reviews WHERE vendorName = ? AND usedAt != ""', [rev.vendorName]) as any;
    const avgRating = stats?.avgR ? Math.round(Number(stats.avgR) * 10) / 10 : 0;
    const reviewCount = stats?.cnt || 0;
    await db.run('UPDATE colleagues SET avgRating = ?, reviewCount = ? WHERE name = ?', [avgRating, reviewCount, rev.vendorName]);
  }

  res.json({ ok: true });
});

// DELETE all test reviews (admin only)
app.delete('/api/admin/reviews', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  await db.run('DELETE FROM reviews');
  await db.run('UPDATE colleagues SET avgRating = 0, reviewCount = 0');
  res.json({ ok: true });
});


// ── EMAIL CAMPAIGNS ──
app.get('/api/email-campaigns', async (req, res) => {
  const campaigns = await db.all('SELECT * FROM email_campaigns ORDER BY createdAt DESC', []) as any[];
  res.json(campaigns);
});

app.post('/api/email-campaigns', async (req, res) => {
  const { name, templateId, smtpId, sendDelay = 3, createdBy = '' } = req.body;
  if (!name?.trim() || !templateId || !smtpId) {
    return res.status(400).json({ error: 'name, templateId e smtpId sono obbligatori' });
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.run(`
    INSERT INTO email_campaigns (id, name, templateId, smtpId, status, totalSent, totalOpened, totalClicked, totalReplied, sendDelay, createdBy, createdAt, sentAt)
    VALUES (?, ?, ?, ?, 'draft', 0, 0, 0, 0, ?, ?, ?, '')
  `, [id, name.trim(), templateId, smtpId, Number(sendDelay), createdBy, now]);
  res.status(201).json(await db.get('SELECT * FROM email_campaigns WHERE id = ?', [id]));
});

app.delete('/api/email-campaigns/:id', async (req, res) => {
  await db.run('DELETE FROM email_campaigns WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── CAMPAIGN RECIPIENTS ──
app.get('/api/email-campaigns/:id/recipients', async (req, res) => {
  const recipients = await db.all(
    'SELECT * FROM email_campaign_recipients WHERE campaignId = ? ORDER BY sentAt DESC'
  , [req.params.id]) as any[];

  const withTemp = recipients.map(r => ({
    ...r,
    temperature: (r.repliedAt ? 40 : 0) + (r.clickedAt ? 20 : 0) + (r.openedAt ? 10 : 0),
  }));
  res.json(withTemp);
});

app.post('/api/email-campaigns/:id/recipients', async (req, res) => {
  const { campaignId } = { campaignId: req.params.id };
  const { leadIds } = req.body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds richiesto' });
  }
  const campaign = await db.get('SELECT * FROM email_campaigns WHERE id = ?', [campaignId]) as any;
  if (!campaign) return res.status(404).json({ error: 'Campagna non trovata' });
  if (campaign.status !== 'draft') return res.status(400).json({ error: 'Campagna non in stato draft' });

  let added = 0;
  for (const lid of leadIds) {
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [lid]) as any;
    if (!lead || !lead.email) continue;
    const existing = await db.get('SELECT id FROM email_campaign_recipients WHERE campaignId = ? AND leadId = ?', [campaignId, lid]);
    if (existing) continue;
    await db.run(`
      INSERT INTO email_campaign_recipients (id, campaignId, leadId, email, leadName, status, openedAt, clickedAt, repliedAt, replyText, messageId, sentAt, errorMsg)
      VALUES (?, ?, ?, ?, ?, 'pending', '', '', '', '', '', '', '')
    `, [randomUUID(), campaignId, lid, lead.email.toLowerCase(), lead.name]);
    added++;
  }
  res.json({ ok: true, added });
});

app.delete('/api/email-campaigns/:id/recipients/:rid', async (req, res) => {
  await db.run('DELETE FROM email_campaign_recipients WHERE id = ? AND campaignId = ?', [req.params.rid, req.params.id]);
  res.json({ ok: true });
});

// ── SEND CAMPAIGN ──
app.post('/api/email-campaigns/:id/send', async (req, res) => {
  let campaign: any;
  let template: any;
  let smtp: any;
  let recipients: any[];
  let baseUrl: string;
  let publicUrlSetting: string;
  try {
    campaign = await db.get('SELECT * FROM email_campaigns WHERE id = ?', [req.params.id]) as any;
    if (!campaign) return res.status(404).json({ error: 'Campagna non trovata' });
    if (campaign.status === 'sending') return res.status(400).json({ error: 'Invio già in corso' });

    template = await db.get('SELECT * FROM email_templates WHERE id = ?', [campaign.templateId]) as any;
    if (!template) return res.status(404).json({ error: 'Template non trovato' });

    smtp = await db.get('SELECT * FROM smtp_accounts WHERE id = ?', [campaign.smtpId]) as any;
    if (!smtp) return res.status(404).json({ error: 'Account SMTP non trovato' });

    recipients = await db.all(
      "SELECT * FROM email_campaign_recipients WHERE campaignId = ? AND status = 'pending'"
    , [campaign.id]) as any[];

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'Nessun destinatario in stato pending' });
    }

    // Mark as sending immediately
    await db.run("UPDATE email_campaigns SET status = 'sending', sentAt = ? WHERE id = ?", [new Date().toISOString(), campaign.id]);

    // Prefer the configured public_url (needed for tracking from external email clients)
    publicUrlSetting = (await db.get("SELECT value FROM settings WHERE `key` = 'public_url'", []) as any)?.value || '';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host') || 'localhost:3000';
    baseUrl = publicUrlSetting.trim() || `${protocol}://${host}`;

    res.json({ ok: true, total: recipients.length, message: 'Invio avviato in background', baseUrl, trackingWarning: !publicUrlSetting.trim() ? 'ATTENZIONE: nessun URL pubblico configurato. Il tracking aperture/click potrebbe non funzionare se il server non è accessibile da internet. Configura public_url nelle impostazioni.' : '' });
  } catch (error: any) {
    console.error('[email-campaigns/send] avvio:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Errore durante l\'avvio dell\'invio: ' + (error?.message || 'sconosciuto') });
    return;
  }

  // Background send loop
  (async () => {
    let sentCount = 0;
    try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user_email, pass: smtp.pass },
    });

    for (const r of recipients) {
      const now = new Date().toISOString();
      try {
        const lead = await db.get('SELECT * FROM leads WHERE id = ?', [r.leadId]) as any;
        const leadName = lead?.name || r.leadName || '';
        const company = lead?.company || leadName;

        // Process template body — replace placeholders
        let rawContent = template.body
          .replace(/\{nome\}/g, leadName)
          .replace(/\{azienda\}/g, company)
          .replace(/\{agente\}/g, '')
          .replace(/\{servizio\}/g, lead?.service || '');

        // If template doesn't contain HTML tags, convert newlines to <br/> for proper formatting
        const hasHtmlTags = /<[a-z][\s\S]*>/i.test(rawContent);
        if (!hasHtmlTags) {
          rawContent = rawContent.replace(/\r\n/g, '<br/>').replace(/\n/g, '<br/>');
        }

        // Rewrite all <a href="..."> links for click tracking
        rawContent = rawContent.replace(/href="(https?:\/\/[^"]+)"/gi, (match: string, url: string) => {
          const trackUrl = `${baseUrl}/api/email-track/click?eid=${encodeURIComponent(r.id)}&url=${encodeURIComponent(url)}`;
          return `href="${trackUrl}"`;
        });

        // Open tracking pixel
        const pixelUrl = `${baseUrl}/api/email-track/open?eid=${encodeURIComponent(r.id)}`;
        const pixelTag = `<img src="${pixelUrl}" width="1" height="1" border="0" alt="" style="height:1px!important;width:1px!important;border:0!important;margin:0!important;padding:0!important;outline:none!important;" />`;

        // Wrap in full standard HTML email structure
        let finalBody = '';
        if (rawContent.includes('</body>')) {
          finalBody = rawContent.replace('</body>', `${pixelTag}</body>`);
        } else {
          finalBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; background-color: #ffffff;">
  ${rawContent}
  ${pixelTag}
</body>
</html>`;
        }

        const finalSubject = template.subject
          .replace(/\{nome\}/g, leadName)
          .replace(/\{azienda\}/g, company)
          .replace(/\{agente\}/g, '');

        const info = await transporter.sendMail({
          from: smtp.user_email,
          to: r.email,
          subject: finalSubject,
          html: finalBody,
          headers: {
            'X-Campaign-Id': campaign.id,
            'X-Recipient-Id': r.id,
          },
        });

        const messageId = info.messageId || '';
        await db.run(`
          UPDATE email_campaign_recipients SET status = 'sent', sentAt = ?, messageId = ? WHERE id = ?
        `, [now, messageId, r.id]);

        await db.run(`
          UPDATE email_campaigns SET totalSent = totalSent + 1 WHERE id = ?
        `, [campaign.id]);

        await db.run(`
          INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type)
          VALUES (?, ?, ?, ?, ?, ?, 'email')
        `, [randomUUID(), r.leadId, now, 'Campagna Email', `[📧 EMAIL CAMPAGNA INVIATA] Campagna: "${campaign.name}" → ${r.email}`, lead?.status || '']);

        sentCount++;
      } catch (err: any) {
        await db.run(`
          UPDATE email_campaign_recipients SET status = 'failed', errorMsg = ? WHERE id = ?
        `, [String(err?.message || 'Errore sconosciuto'), r.id]);
      }

      // Delay between sends
      if (campaign.sendDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, campaign.sendDelay * 1000));
      }
    }

    // Mark campaign as sent
    await db.run("UPDATE email_campaigns SET status = 'sent' WHERE id = ?", [campaign.id]);
    console.log(`[CAMPAIGN] "${campaign.name}" completata: ${sentCount} email inviate.`);
    } catch (error: any) {
      console.error(`[CAMPAIGN] "${campaign?.name}" interrotta da un errore:`, error);
      // Torna in pausa (non 'failed', stato non gestito dalla UI) così l'utente può
      // rilanciare l'invio: i destinatari già segnati sent/failed non verranno reinviati.
      try {
        await db.run("UPDATE email_campaigns SET status = 'paused' WHERE id = ?", [campaign.id]);
      } catch (e) { console.error('[CAMPAIGN] impossibile aggiornare lo stato a paused:', e); }
    }
  })();
});

app.post('/api/email-campaigns/:id/pause', async (req, res) => {
  await db.run("UPDATE email_campaigns SET status = 'paused' WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// ── EMAIL TRACKING ──

// 1x1 GIF pixel (transparent)
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

app.get('/api/email-track/open', async (req, res) => {
  const { eid } = req.query as { eid: string };
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(TRACKING_PIXEL);

  // Process tracking asynchronously AFTER sending response
  process.nextTick(async () => {
    if (!eid) return;
    try {
      const r = await db.get('SELECT * FROM email_campaign_recipients WHERE id = ?', [eid]) as any;
      if (r && !r.openedAt) {
        const now = new Date().toISOString();
        await db.run('UPDATE email_campaign_recipients SET openedAt = ? WHERE id = ?', [now, eid]);
        await db.run('UPDATE email_campaigns SET totalOpened = totalOpened + 1 WHERE id = ?', [r.campaignId]);
        const campaignName = (await db.get('SELECT name FROM email_campaigns WHERE id=?', [r.campaignId]) as any)?.name || '';
        const lead = await db.get('SELECT * FROM leads WHERE id = ?', [r.leadId]) as any;
        await db.run('INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [randomUUID(), r.leadId, now, 'Tracking Email', `👁️ [EMAIL APERTA] Il lead ha aperto l'email della campagna "${campaignName}"`, lead?.status || '', 'email']);
        console.log(`[TRACKING OPEN] Lead ${r.leadId} ha aperto l'email campagna ${r.campaignId}`);
      }
    } catch (e) {
      console.error('[email-track/open]', e);
    }
  });
});

app.get('/api/email-track/click', async (req, res) => {
  const { eid, url } = req.query as { eid: string; url: string };
  const targetUrl = url ? decodeURIComponent(url) : '/';

  // Process tracking BEFORE redirect (both happen before client gets response)
  if (eid) {
    try {
      const r = await db.get('SELECT * FROM email_campaign_recipients WHERE id = ?', [eid]) as any;
      if (r) {
        const now = new Date().toISOString();
        // If clicked, lead MUST have opened the email!
        if (!r.openedAt) {
          await db.run('UPDATE email_campaign_recipients SET openedAt = ? WHERE id = ?', [now, eid]);
          await db.run('UPDATE email_campaigns SET totalOpened = totalOpened + 1 WHERE id = ?', [r.campaignId]);
        }
        if (!r.clickedAt) {
          await db.run('UPDATE email_campaign_recipients SET clickedAt = ? WHERE id = ?', [now, eid]);
          await db.run('UPDATE email_campaigns SET totalClicked = totalClicked + 1 WHERE id = ?', [r.campaignId]);
        }
        const lead = await db.get('SELECT * FROM leads WHERE id = ?', [r.leadId]) as any;
        await db.run('INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [randomUUID(), r.leadId, now, 'Tracking Email', `🖱️ [LINK CLICCATO] Il lead ha cliccato un link nell'email → ${targetUrl}`, lead?.status || '', 'email']);
        console.log(`[TRACKING CLICK] Lead ${r.leadId} ha cliccato nell'email campagna ${r.campaignId}`);
      }
    } catch (e) {
      console.error('[email-track/click]', e);
    }
  }

  res.redirect(302, targetUrl);
});

// ── IMAP ACCOUNTS ──
app.get('/api/imap-accounts', async (req, res) => {
  res.json(await db.all('SELECT * FROM imap_accounts ORDER BY name ASC', []));
});

app.post('/api/imap-accounts', async (req, res) => {
  const { name, host = '', port = '993', user_email = '', pass = '', useSSL = true } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name richiesto' });
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.run('INSERT INTO imap_accounts (id, name, host, port, user_email, pass, useSSL, lastChecked, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name.trim(), host, port, user_email, pass, useSSL ? 1 : 0, '', now]);
  res.status(201).json(await db.get('SELECT * FROM imap_accounts WHERE id = ?', [id]));
});

app.put('/api/imap-accounts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, host, port, user_email, pass, useSSL } = req.body;
  await db.run(`
    UPDATE imap_accounts SET
      name = COALESCE(?, name), host = COALESCE(?, host), port = COALESCE(?, port),
      user_email = COALESCE(?, user_email), pass = COALESCE(?, pass),
      useSSL = COALESCE(?, useSSL)
    WHERE id = ?
  `, [name, host, port, user_email, pass, useSSL !== undefined ? (useSSL ? 1 : 0) : null, id]);
  res.json(await db.get('SELECT * FROM imap_accounts WHERE id = ?', [id]));
});

app.delete('/api/imap-accounts/:id', async (req, res) => {
  await db.run('DELETE FROM imap_accounts WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// Force IMAP check for a specific account
app.post('/api/imap-accounts/:id/check', async (req, res) => {
  try {
    const account = await db.get('SELECT * FROM imap_accounts WHERE id = ?', [req.params.id]) as any;
    if (!account) return res.status(404).json({ error: 'Account IMAP non trovato' });
    const { repliesFound, inboxMatches } = await runImapCheck(account);
    res.json({ ok: true, repliesFound, inboxMatches });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Errore IMAP' });
  }
});

// ── IMAP CHECK FUNCTION ──
// Returns { repliesFound, inboxMatches }
async function runImapCheck(account: any): Promise<{ repliesFound: number; inboxMatches: number }> {
  let imapflow: any;
  try {
    imapflow = await import('imapflow');
  } catch (e) {
    console.warn('[IMAP] imapflow non disponibile:', e);
    return { repliesFound: 0, inboxMatches: 0 };
  }
  const { ImapFlow } = imapflow;

  const client = new ImapFlow({
    host: account.host,
    port: Number(account.port),
    secure: Boolean(account.useSSL),
    auth: { user: account.user_email, pass: account.pass },
    logger: false,
  });

  // Helper: extract plain text from raw email source
  function extractBodyText(rawSource: Buffer): string {
    const raw = rawSource.toString('utf8');
    const sepIdx = raw.indexOf('\r\n\r\n') !== -1 ? raw.indexOf('\r\n\r\n') + 4 : raw.indexOf('\n\n') + 2;
    let body = sepIdx > 2 ? raw.slice(sepIdx) : '';
    const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1].trim();
      const parts = body.split('--' + boundary);
      for (const part of parts) {
        if (/content-type:\s*text\/plain/i.test(part)) {
          const pSep = part.indexOf('\r\n\r\n') !== -1 ? part.indexOf('\r\n\r\n') + 4 : part.indexOf('\n\n') + 2;
          if (pSep > 2) { body = part.slice(pSep); break; }
        }
      }
    }
    const cleaned = body.split('\n').filter(l => !l.trim().startsWith('>')).join('\n');
    const sigIdx = cleaned.search(/\n--\s*\n|\n-- \n/);
    return (sigIdx !== -1 ? cleaned.slice(0, sigIdx) : cleaned).trim().slice(0, 2000);
  }

  let repliesFound = 0;
  let inboxMatches = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Cutoff: solo messaggi dopo l'ultimo check (o ultimi 7 giorni se primo avvio)
      const sinceDate = account.lastChecked
        ? new Date(account.lastChecked)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Fetch tutti i messaggi con solo headers (leggero) e filtra per data lato JS
      // — più compatibile di client.search() con UID su server Hostinger IMAP
      const messages: any[] = [];
      for await (const msg of client.fetch('1:*', {
        envelope: true,
        source: { headersOnly: true },
      })) {
        const msgDate = msg.envelope?.date ? new Date(msg.envelope.date) : null;
        if (!msgDate || msgDate >= sinceDate) {
          messages.push(msg);
        }
      }

      if (messages.length === 0) {
        return { repliesFound: 0, inboxMatches: 0 };
      }

      // ── PART 1: Campaign reply detection ──
      const sentRecipients = await db.all(
        "SELECT * FROM email_campaign_recipients WHERE status = 'sent' AND messageId != '' AND repliedAt = ''",
        []
      ) as any[];
      const sentMessageIds = new Set(sentRecipients.map((r: any) => r.messageId.replace(/[<>]/g, '')));
      // Track which Message-IDs we handle as campaign replies (to skip in inbox scanner)
      const handledAsReply = new Set<string>();

      for (const msg of messages) {
        const inReplyTo = (msg.envelope?.inReplyTo || '').replace(/[<>]/g, '').trim();
        const references = (msg.envelope?.references || '').replace(/[<>]/g, ' ').split(/\s+/).filter(Boolean);
        const matchId = [...references, inReplyTo].find(id => id && sentMessageIds.has(id));
        if (!matchId) continue;

        const recipient = sentRecipients.find((r: any) => r.messageId.replace(/[<>]/g, '') === matchId);
        if (!recipient) continue;

        const msgId = (msg.envelope?.messageId || '').replace(/[<>]/g, '').trim();
        if (msgId) handledAsReply.add(msgId);

        const now = new Date().toISOString();
        let replyText = `Risposta ricevuta da ${msg.envelope?.from?.[0]?.address || recipient.email}`;
        try {
          const fullMsg = await client.fetchOne(String(msg.seq), { source: true });
          if (fullMsg?.source) {
            const parsed = extractBodyText(fullMsg.source);
            if (parsed.length > 0) replyText = parsed;
          }
        } catch (_) { /* use fallback */ }

        if (!recipient.openedAt) {
          await db.run('UPDATE email_campaign_recipients SET openedAt = ? WHERE id = ?', [now, recipient.id]);
          await db.run('UPDATE email_campaigns SET totalOpened = totalOpened + 1 WHERE id = ?', [recipient.campaignId]);
        }
        await db.run('UPDATE email_campaign_recipients SET repliedAt = ?, replyText = ? WHERE id = ?', [now, replyText, recipient.id]);
        await db.run('UPDATE email_campaigns SET totalReplied = totalReplied + 1 WHERE id = ?', [recipient.campaignId]);

        const lead = await db.get('SELECT * FROM leads WHERE id = ?', [recipient.leadId]) as any;
        await db.run(
          `INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type) VALUES (?, ?, ?, ?, ?, ?, 'email')`,
          [randomUUID(), recipient.leadId, now, 'IMAP Monitor',
           `💬 [RISPOSTA EMAIL RICEVUTA] Il lead ha risposto all'email della campagna:\n\n${replyText.slice(0, 500)}`,
           lead?.status || '']
        );
        repliesFound++;
      }

      // ── PART 2: Inbox Scanner — match email by sender address ──
      const allLeads = await db.all(
        "SELECT id, email, name, status FROM leads WHERE email IS NOT NULL AND email != ''", []
      ) as any[];
      const leadsByEmail = new Map(allLeads.map(l => [l.email.toLowerCase().trim(), l]));
      const ownEmail = (account.user_email || '').toLowerCase().trim();

      for (const msg of messages) {
        const msgId = (msg.envelope?.messageId || '').replace(/[<>]/g, '').trim();
        // Skip messages already processed as campaign replies
        if (msgId && handledAsReply.has(msgId)) continue;

        const senderEmail = (msg.envelope?.from?.[0]?.address || '').toLowerCase().trim();
        // Skip empty sender or messages sent from ourselves
        if (!senderEmail || senderEmail === ownEmail) continue;

        const matchedLead = leadsByEmail.get(senderEmail);
        if (!matchedLead) continue;

        // Avoid duplicates: check if this Message-ID is already logged
        if (msgId) {
          const alreadyLogged = await db.get(
            "SELECT id FROM history WHERE note LIKE ? LIMIT 1",
            [`%[MSGID:${msgId}]%`]
          );
          if (alreadyLogged) continue;
        }

        const now = new Date().toISOString();
        const subject = msg.envelope?.subject || '(nessun oggetto)';
        let bodyText = `Email ricevuta da ${senderEmail}`;
        try {
          const fullMsg = await client.fetchOne(String(msg.seq), { source: true });
          if (fullMsg?.source) {
            const parsed = extractBodyText(fullMsg.source);
            if (parsed.length > 0) bodyText = parsed;
          }
        } catch (_) { /* use fallback */ }

        // Tag hidden [MSGID:...] per deduplicazione futura
        const noteContent =
          `📩 [EMAIL RICEVUTA] Da: ${senderEmail}\nOggetto: "${subject}"\n\n${bodyText.slice(0, 1500)}` +
          (msgId ? `\n\n[MSGID:${msgId}]` : '');

        await db.run(
          `INSERT INTO history (id, leadId, timestamp, colleague, note, statusAfterCall, type) VALUES (?, ?, ?, ?, ?, ?, 'email')`,
          [randomUUID(), matchedLead.id, now, 'Inbox Scanner', noteContent, matchedLead.status || '']
        );
        console.log(`[INBOX SCANNER] Email da "${senderEmail}" abbinata al lead "${matchedLead.name}"`);
        inboxMatches++;
      }

    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error('[IMAP check]', err);
    throw err;
  }

  await db.run("UPDATE imap_accounts SET lastChecked = ? WHERE id = ?", [new Date().toISOString(), account.id]);
  console.log(`[IMAP CHECK] "${account.name}": ${repliesFound} risposte campagna, ${inboxMatches} email inbox abbinate`);
  return { repliesFound, inboxMatches };
}

// ── IMAP POLLING JOB (every 10 min) ──
setInterval(async () => {
  const accounts = await db.all('SELECT * FROM imap_accounts', []) as any[];
  if (accounts.length === 0) return;
  console.log(`[IMAP POLL] Controllo ${accounts.length} account IMAP...`);
  for (const acc of accounts) {
    try {
      const { repliesFound, inboxMatches } = await runImapCheck(acc);
      if (repliesFound > 0 || inboxMatches > 0)
        console.log(`[IMAP POLL] ${acc.name}: ${repliesFound} risposte campagna, ${inboxMatches} email scanner.`);
    } catch (e) {
      console.error(`[IMAP POLL] Errore account ${acc.name}:`, e);
    }
  }
}, 10 * 60 * 1000); // 10 minutes

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      // In production bundle without vite installed
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

