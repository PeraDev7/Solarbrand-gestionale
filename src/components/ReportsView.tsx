import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { Lead, HistoryItem, Colleague, Appointment, VisitReport } from '../types';
import { Download, FileText, FileDown, MapPin, Phone } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsViewProps {
  leads: Lead[];
  colleagues: Colleague[];
  services: string[];
}

interface EnrichedHistory extends HistoryItem {
  leadName: string;
  leadService: string;
  leadServices: string[];
  leadCompany: string;
}

export interface SopralluogoItem {
  id: string;
  sourceType: 'appointment' | 'visit_report';
  category: 'sopralluogo_fatto' | 'appuntamento_fissato';
  categoryLabel: string;
  dateTime: string;
  leadId: string;
  leadName: string;
  leadCompany: string;
  leadPhone: string;
  leadEmail: string;
  leadAddress: string;
  leadServices: string[];
  vendor: string;      // Agente commerciale
  colleague: string;   // Fissato da (Telefonista)
  status: string;      // es. 'Effettuato (Contratto Firmato)', 'Fissato / In attesa', 'Non effettuato'
  outcome: string;     // es. 'contratto_firmato', 'interessato', ecc.
  contractValue: number;
  kwpSystem: number;
  hasHeatPump: boolean;
  notes: string;
  nextAction: string;
  quoteStatus: string;
}

// Brand colors (RGB tuples)
const BRAND_INDIGO: [number, number, number] = [67, 56, 202];
const BRAND_INDIGO_LIGHT: [number, number, number] = [238, 242, 255];
const BRAND_AMBER: [number, number, number] = [245, 158, 11];
const BRAND_EMERALD: [number, number, number] = [5, 150, 105];
const BRAND_SLATE_DARK: [number, number, number] = [15, 23, 42];
const BRAND_SLATE_MID: [number, number, number] = [100, 116, 139];
const BRAND_SLATE_LIGHT: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];

export default function ReportsView({ leads, colleagues, services }: ReportsViewProps) {
  const [historyItems, setHistoryItems] = useState<EnrichedHistory[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visitReports, setVisitReports] = useState<VisitReport[]>([]);
  const [loading, setLoading] = useState(false);

  // Ambito report: 'all' (Tutte le attività) oppure 'sopralluoghi' (Solo sopralluoghi & appuntamenti in loco)
  const [reportScope, setReportScope] = useState<'all' | 'sopralluoghi'>('all');
  const [sopralluoghiSubFilter, setSopralluoghiSubFilter] = useState<'all' | 'fatti' | 'fissati'>('all');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    loadData(historyItems.length === 0);
  }, [leads]);

  const loadData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [histData, apptsData, vReportsData] = await Promise.all([
        api.getAllHistory().catch(() => []),
        api.getAppointments().catch(() => []),
        api.getVisitReports().catch(() => [])
      ]);

      setHistoryItems((histData || []).map((item: any) => ({
        ...item,
        leadName: item.leadName || 'Lead',
        leadCompany: item.leadCompany || '',
        leadService: item.leadService || '',
        leadServices: item.leadServices || (item.leadService ? [item.leadService] : [])
      })));

      setAppointments(apptsData || []);
      setVisitReports(vReportsData || []);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const toggleColleague = (name: string) => {
    setSelectedColleagues(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const toggleService = (srv: string) => {
    setSelectedServices(prev =>
      prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]
    );
  };

  // ── ELENCO UNIFICATO SOPRALLUOGHI & APPUNTAMENTI IN LOCO ────────────────────
  const allSopralluoghiItems = useMemo<SopralluogoItem[]>(() => {
    const list: SopralluogoItem[] = [];
    const leadMap = new Map<string, Lead>();
    leads.forEach(l => leadMap.set(l.id, l));

    // Mappa visit reports per appointmentId per unire l'appuntamento alla sua scheda visita
    const reportsByApptId = new Map<string, VisitReport>();
    const handledReportIds = new Set<string>();
    visitReports.forEach(vr => {
      if (vr.appointmentId) {
        reportsByApptId.set(vr.appointmentId, vr);
      }
    });

    // 1. Elabora tutti gli appuntamenti (escludendo i meri richiami telefonici)
    appointments.forEach(app => {
      const isCall = app.appointmentType === 'call' || (app.title && app.title.toLowerCase().includes('richiamo'));
      if (isCall) return; // Esclude i richiami telefonici dell'ufficio

      const lead = leadMap.get(app.leadId);
      const vr = reportsByApptId.get(app.id);
      if (vr) handledReportIds.add(vr.id);

      const isDone = vr ? (vr.visitStatus === 'effettuato') : (app.visitStatus === 'completed' || app.completed === 'true');
      const isNotDone = vr ? (vr.visitStatus === 'non_effettuato') : (app.visitStatus === 'not_done');
      const isCancelled = app.completed === 'cancelled';

      const category: 'sopralluogo_fatto' | 'appuntamento_fissato' = isDone ? 'sopralluogo_fatto' : 'appuntamento_fissato';
      const categoryLabel = isDone ? 'Sopralluogo Effettuato' : 'Appuntamento Sopralluogo';

      let status = 'Fissato / In attesa';
      if (isCancelled) status = 'Annullato';
      else if (isNotDone) status = 'Non effettuato';
      else if (isDone) {
        if (vr?.outcome === 'contratto_firmato') status = 'Effettuato (Contratto Firmato)';
        else if (vr?.outcome === 'interessato') status = 'Effettuato (Interessato)';
        else if (vr?.outcome === 'trattativa_in_corso') status = 'Effettuato (Trattativa)';
        else if (vr?.outcome === 'non_interessato') status = 'Effettuato (Non Interessato)';
        else if (vr?.outcome === 'da_ricontattare') status = 'Effettuato (Da Richiamare)';
        else status = 'Effettuato';
      }

      const itemServices = lead?.services && lead.services.length > 0 
        ? lead.services 
        : lead?.service ? [lead.service] : [];

      list.push({
        id: `appt_${app.id}`,
        sourceType: 'appointment',
        category,
        categoryLabel,
        dateTime: vr?.visitDate || app.dateTime || app.createdAt || '',
        leadId: app.leadId,
        leadName: app.leadName || lead?.name || 'Lead',
        leadCompany: lead?.company || '',
        leadPhone: lead?.phone || '',
        leadEmail: lead?.email || '',
        leadAddress: lead?.address || '',
        leadServices: itemServices,
        vendor: vr?.vendorName || app.assignedVendor || lead?.assignedColleague || '',
        colleague: app.colleague || lead?.assignedTelefonisti?.[0] || 'Ufficio',
        status,
        outcome: vr?.outcome || '',
        contractValue: vr?.contractValue || 0,
        kwpSystem: vr?.kwpSystem || 0,
        hasHeatPump: Boolean(vr?.hasHeatPump),
        notes: vr?.notes || app.notes || app.title || '',
        nextAction: vr?.nextAction || '',
        quoteStatus: vr?.quoteStatus || lead?.quoteStatus || 'nessuno',
      });
    });

    // 2. Aggiunge eventuali schede di sopralluogo non direttamente collegate ad un appuntamento
    visitReports.forEach(vr => {
      if (handledReportIds.has(vr.id)) return;
      const lead = leadMap.get(vr.leadId);
      const isDone = vr.visitStatus === 'effettuato';
      const itemServices = lead?.services && lead.services.length > 0 
        ? lead.services 
        : lead?.service ? [lead.service] : [];

      let status = isDone ? 'Effettuato' : 'Non effettuato';
      if (isDone && vr.outcome) {
        if (vr.outcome === 'contratto_firmato') status = 'Effettuato (Contratto Firmato)';
        else if (vr.outcome === 'interessato') status = 'Effettuato (Interessato)';
        else if (vr.outcome === 'trattativa_in_corso') status = 'Effettuato (Trattativa)';
        else if (vr.outcome === 'non_interessato') status = 'Effettuato (Non Interessato)';
        else if (vr.outcome === 'da_ricontattare') status = 'Effettuato (Da Richiamare)';
      }

      list.push({
        id: `vr_${vr.id}`,
        sourceType: 'visit_report',
        category: isDone ? 'sopralluogo_fatto' : 'appuntamento_fissato',
        categoryLabel: isDone ? 'Sopralluogo Effettuato' : 'Sopralluogo Non Effettuato',
        dateTime: vr.visitDate || vr.createdAt || '',
        leadId: vr.leadId,
        leadName: lead?.name || 'Lead',
        leadCompany: lead?.company || '',
        leadPhone: lead?.phone || '',
        leadEmail: lead?.email || '',
        leadAddress: lead?.address || '',
        leadServices: itemServices,
        vendor: vr.vendorName || lead?.assignedColleague || '',
        colleague: lead?.assignedTelefonisti?.[0] || 'Ufficio',
        status,
        outcome: vr.outcome || '',
        contractValue: vr.contractValue || 0,
        kwpSystem: vr.kwpSystem || 0,
        hasHeatPump: Boolean(vr.hasHeatPump),
        notes: vr.notes || '',
        nextAction: vr.nextAction || '',
        quoteStatus: vr.quoteStatus || lead?.quoteStatus || 'nessuno',
      });
    });

    // Ordina per data decrescente
    return list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [appointments, visitReports, leads]);

  // ── FILTRO SOPRALLUOGHI ──────────────────────────────────────────────────────
  const filteredSopralluoghi = useMemo(() => {
    return allSopralluoghiItems.filter(item => {
      // Sotto-filtro stato
      if (sopralluoghiSubFilter === 'fatti' && item.category !== 'sopralluogo_fatto') return false;
      if (sopralluoghiSubFilter === 'fissati' && item.category !== 'appuntamento_fissato') return false;

      // Filtro Agente & Telefonista
      if (selectedColleagues.length > 0) {
        const matchesVendor = selectedColleagues.some(sc => sc.trim().toLowerCase() === item.vendor.trim().toLowerCase());
        const matchesColleague = selectedColleagues.some(sc => sc.trim().toLowerCase() === item.colleague.trim().toLowerCase());
        if (!matchesVendor && !matchesColleague) return false;
      }

      // Filtro Tipologia / Servizi
      if (selectedServices.length > 0) {
        if (!item.leadServices.some(s => selectedServices.includes(s))) return false;
      }

      // Filtro Intervallo Date
      if (dateFrom) {
        const fromDate = new Date(dateFrom); fromDate.setHours(0, 0, 0, 0);
        if (new Date(item.dateTime) < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo); toDate.setHours(23, 59, 59, 999);
        if (new Date(item.dateTime) > toDate) return false;
      }

      return true;
    });
  }, [allSopralluoghiItems, sopralluoghiSubFilter, selectedColleagues, selectedServices, dateFrom, dateTo]);

  // ── FILTRO STORICO ATTIVITÀ (MODALITÀ STANDARD) ──────────────────────────────
  const filteredHistory = useMemo(() => {
    return historyItems.filter(item => {
      if (selectedColleagues.length > 0) {
        const matchDirect = selectedColleagues.includes(item.colleague);
        const matchInNote = selectedColleagues.some(sc => item.note && item.note.includes(sc));
        if (!matchDirect && !matchInNote) return false;
      }
      if (selectedServices.length > 0) {
        const itemServices = item.leadServices && item.leadServices.length > 0 ? item.leadServices : [item.leadService];
        if (!itemServices.some(s => selectedServices.includes(s))) return false;
      }
      if (dateFrom) {
        const fromDate = new Date(dateFrom); fromDate.setHours(0, 0, 0, 0);
        if (new Date(item.timestamp) < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo); toDate.setHours(23, 59, 59, 999);
        if (new Date(item.timestamp) > toDate) return false;
      }
      return true;
    });
  }, [historyItems, selectedColleagues, selectedServices, dateFrom, dateTo]);

  // Conteggio attivo corrente in base all'ambito scelto
  const currentItemsCount = reportScope === 'sopralluoghi' ? filteredSopralluoghi.length : filteredHistory.length;

  // ── EXCEL EXPORT SOPRALLUOGHI ────────────────────────────────────────────────
  const exportSopralluoghiExcel = () => {
    const dataToExport = filteredSopralluoghi.map(item => ({
      'Data e Ora': item.dateTime ? new Date(item.dateTime).toLocaleString('it-IT') : '-',
      'Tipo Evento': item.categoryLabel,
      'Stato / Esito': item.status,
      'Lead / Contatto': item.leadName,
      'Azienda': item.leadCompany || '-',
      'Telefono': item.leadPhone || '-',
      'Email': item.leadEmail || '-',
      'Indirizzo': item.leadAddress || '-',
      'Tipologia / Servizi': item.leadServices?.join(', ') || '-',
      'Agente Commerciale': item.vendor || 'Nessuno',
      'Fissato Da (Telefonista)': item.colleague || 'Ufficio',
      'Impianto (kWp)': item.kwpSystem ? `${item.kwpSystem} kWp` : '-',
      'Pompa di Calore': item.hasHeatPump ? 'SÌ' : 'NO',
      'Valore Contratto (€)': item.contractValue ? `€ ${item.contractValue.toLocaleString('it-IT')}` : '-',
      'Note / Dettagli': item.notes || '-',
      'Prossima Azione': item.nextAction || '-'
    }));
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Sopralluoghi & Visite');
    writeFile(workbook, `Report_Sopralluoghi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── EXCEL EXPORT STANDARD ATTIVITÀ ───────────────────────────────────────────
  const exportHistoryExcel = () => {
    const dataToExport = filteredHistory.map(item => ({
      'Data e Ora': new Date(item.timestamp).toLocaleString('it-IT'),
      'Operatore': item.colleague || 'Nessuno',
      'Lead / Contatto': item.leadName,
      'Azienda': item.leadCompany,
      'Servizi': item.leadServices?.join(', ') || item.leadService,
      'Tipo Attività': item.type === 'call' ? 'Chiamata' : item.type === 'email' ? 'Email' : item.type === 'visit_report' ? 'Sopralluogo' : 'Nota',
      'Stato Assegnato': item.statusAfterCall || '-',
      'Dettagli / Nota': item.note || '-'
    }));
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Report Attività');
    writeFile(workbook, `Report_Attivita_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportExcel = () => {
    if (reportScope === 'sopralluoghi') {
      exportSopralluoghiExcel();
    } else {
      exportHistoryExcel();
    }
  };

  // Helper per ripulire caratteri unicode/emoji non supportati dai font standard jsPDF
  const sanitizePdfText = (str: string | null | undefined): string => {
    if (!str) return '-';
    return str
      .replace(/📄/g, '[DOC]')
      .replace(/📱/g, '[WA]')
      .replace(/📧/g, '[EMAIL]')
      .replace(/✓/g, '[OK]')
      .replace(/✗/g, '[NO]')
      .replace(/★/g, '*')
      .replace(/🏢/g, '[AZIENDA]')
      .replace(/🏠/g, '[RES]')
      .replace(/🔥/g, '[PDC]')
      .replace(/🏆/g, '[WIN]')
      .replace(/⚡/g, '[KW]')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();
  };

  // ── PDF EXPORT SOPRALLUOGHI ──────────────────────────────────────────────────
  const exportSopralluoghiPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;
    const genStr = new Date().toLocaleString('it-IT');

    const drawCoverHeader = () => {
      doc.setFillColor(...BRAND_INDIGO);
      doc.rect(0, 0, pageW, 48, 'F');
      // Logo circle
      doc.setFillColor(...BRAND_AMBER);
      doc.circle(margin + 8, 12, 6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...WHITE);
      doc.text('SB', margin + 8, 13.5, { align: 'center' });
      // Brand name
      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
      doc.text('SolarBrand', margin + 18, 14);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(199, 210, 254);
      doc.text('Gestionale Commerciale & Sopralluoghi', margin + 18, 20);
      // Main title
      doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
      const mainTitleStr = selectedColleagues.length === 1 
        ? `Report Sopralluoghi: ${selectedColleagues[0]}` 
        : 'Report Sopralluoghi & Visite';
      doc.text(mainTitleStr, margin, 36);
      doc.setFontSize(11); 
      doc.text('Appuntamenti in loco e sopralluoghi effettuati', margin, 43);
    };

    const drawSectionHeader = () => {
      doc.setFillColor(...BRAND_INDIGO);
      doc.rect(0, 0, pageW, 12, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(199, 210, 254);
      doc.text('SolarBrand — Report Sopralluoghi & Visite in Loco', margin, 8);
    };

    const drawFooter = (pageNum: number, totalPgs: number) => {
      doc.setFillColor(...BRAND_SLATE_LIGHT);
      doc.rect(0, pageH - 10, pageW, 10, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...BRAND_SLATE_MID);
      doc.text('SolarBrand — Documento Riservato', margin, pageH - 4);
      doc.text(`Generato il ${genStr}`, pageW / 2, pageH - 4, { align: 'center' });
      doc.text(`Pag. ${pageNum} di ${totalPgs}`, pageW - margin, pageH - 4, { align: 'right' });
    };

    // ── PAGE 1: Cover ──
    drawCoverHeader();

    // Meta info card
    doc.setFillColor(...WHITE);
    doc.roundedRect(margin, 54, contentW, 42, 3, 3, 'F');
    doc.setDrawColor(224, 231, 255);
    doc.roundedRect(margin, 54, contentW, 42, 3, 3, 'S');

    const periodFrom = dateFrom ? new Date(dateFrom).toLocaleDateString('it-IT') : 'Inizio';
    const periodTo = dateTo ? new Date(dateTo).toLocaleDateString('it-IT') : 'Oggi';
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_MID);
    doc.text('PERIODO DI RIFERIMENTO SOPRALLUOGHI', margin + 6, 63);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_DARK);
    doc.text(`${periodFrom}  —  ${periodTo}`, margin + 6, 72);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_SLATE_MID);
    const filterDesc = [
      selectedColleagues.length > 0 ? `Operatore/Agente: ${selectedColleagues.join(', ')}` : 'Tutti gli operatori ed agenti',
      selectedServices.length > 0 ? `Tipologie: ${selectedServices.join(', ')}` : 'Tutte le tipologie',
      sopralluoghiSubFilter === 'fatti' ? 'Stato: Solo Effettuati' : sopralluoghiSubFilter === 'fissati' ? 'Stato: Solo Appuntamenti Fissati' : 'Stato: Tutti'
    ].join('   •   ');
    doc.text(filterDesc, margin + 6, 82);
    doc.text(`Generato il: ${genStr}`, margin + 6, 89);

    // ── KPI Cards ──
    const totalCount = filteredSopralluoghi.length;
    const fattiCount = filteredSopralluoghi.filter(i => i.category === 'sopralluogo_fatto').length;
    const fissatiCount = filteredSopralluoghi.filter(i => i.category === 'appuntamento_fissato').length;
    const contrattiCount = filteredSopralluoghi.filter(i => i.outcome === 'contratto_firmato').length;

    const kpis: { label: string; value: string; color: [number, number, number] }[] = [
      { label: 'Totale Eventi', value: String(totalCount), color: BRAND_INDIGO },
      { label: 'Sopralluoghi Fatti', value: String(fattiCount), color: BRAND_EMERALD },
      { label: 'Appuntam. Fissati', value: String(fissatiCount), color: BRAND_AMBER },
      { label: 'Contratti Firmati', value: String(contrattiCount), color: [16, 185, 129] },
    ];

    const kpiY = 106;
    const kpiW = (contentW - 9) / 4;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_DARK);
    doc.text('Riepilogo Sopralluoghi', margin, kpiY - 4);

    kpis.forEach((kpi, i) => {
      const x = margin + i * (kpiW + 3);
      doc.setFillColor(...kpi.color);
      doc.roundedRect(x, kpiY, kpiW, 22, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...WHITE);
      doc.text(kpi.value, x + kpiW / 2, kpiY + 11, { align: 'center' });
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(kpi.label.toUpperCase(), x + kpiW / 2, kpiY + 18, { align: 'center' });
    });

    // ── Riepilogo per Agente Commerciale ──
    const riepilogoY = kpiY + 32;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_DARK);
    doc.text('Riepilogo per Agente Commerciale', margin, riepilogoY);

    const byVendor: Record<string, { total: number; fatti: number; fissati: number; firmati: number; value: number }> = {};
    filteredSopralluoghi.forEach(item => {
      const v = item.vendor || 'Non Assegnato';
      if (!byVendor[v]) byVendor[v] = { total: 0, fatti: 0, fissati: 0, firmati: 0, value: 0 };
      byVendor[v].total++;
      if (item.category === 'sopralluogo_fatto') byVendor[v].fatti++;
      else byVendor[v].fissati++;
      if (item.outcome === 'contratto_firmato') {
        byVendor[v].firmati++;
        byVendor[v].value += item.contractValue || 0;
      }
    });

    autoTable(doc, {
      startY: riepilogoY + 3,
      head: [['Agente Commerciale', 'Sopralluoghi Fatti', 'Appuntam. Fissati', 'Contratti Firmati', 'Valore Contratti', 'Totale']],
      body: Object.entries(byVendor).map(([name, d]) => [
        name,
        String(d.fatti),
        String(d.fissati),
        String(d.firmati),
        d.value > 0 ? `€ ${d.value.toLocaleString('it-IT')}` : '-',
        String(d.total)
      ]),
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: BRAND_INDIGO, textColor: WHITE, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: BRAND_SLATE_DARK },
        1: { halign: 'center', textColor: BRAND_EMERALD, fontStyle: 'bold' },
        2: { halign: 'center', textColor: BRAND_AMBER },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold', textColor: BRAND_EMERALD },
        5: { halign: 'center', fontStyle: 'bold', textColor: BRAND_INDIGO },
      },
      alternateRowStyles: { fillColor: BRAND_INDIGO_LIGHT },
      rowPageBreak: 'avoid',
      didDrawPage: (data) => { if (data.pageNumber > 1) drawSectionHeader(); },
    });

    // ── Riepilogo per Telefonista / Chi ha fissato ──
    const afterVendorY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_DARK);
    doc.text('Riepilogo per Telefonista / Chi ha Fissato', margin, afterVendorY);

    const byTelephonist: Record<string, { total: number; fatti: number; fissati: number }> = {};
    filteredSopralluoghi.forEach(item => {
      const c = item.colleague || 'Ufficio';
      if (!byTelephonist[c]) byTelephonist[c] = { total: 0, fatti: 0, fissati: 0 };
      byTelephonist[c].total++;
      if (item.category === 'sopralluogo_fatto') byTelephonist[c].fatti++;
      else byTelephonist[c].fissati++;
    });

    autoTable(doc, {
      startY: afterVendorY + 3,
      head: [['Operatore / Telefonista', 'Appuntam. Fissati', 'Sopralluoghi Conclusi', 'Totale Assegnati']],
      body: Object.entries(byTelephonist).map(([name, d]) => [
        name,
        String(d.fissati),
        String(d.fatti),
        String(d.total)
      ]),
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] as [number, number, number], textColor: WHITE, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: BRAND_SLATE_DARK },
        1: { halign: 'center', textColor: BRAND_AMBER },
        2: { halign: 'center', textColor: BRAND_EMERALD, fontStyle: 'bold' },
        3: { halign: 'center', fontStyle: 'bold', textColor: BRAND_INDIGO },
      },
      alternateRowStyles: { fillColor: [240, 253, 244] as [number, number, number] },
      rowPageBreak: 'avoid',
      didDrawPage: (data) => { if (data.pageNumber > 1) drawSectionHeader(); },
    });

    // ── Dettaglio Sopralluoghi (nuova pagina) ──
    doc.addPage();
    drawSectionHeader();

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_INDIGO);
    const detailTitle = selectedColleagues.length === 1 
      ? `Dettaglio Sopralluoghi — ${selectedColleagues[0]}` 
      : 'Dettaglio Sopralluoghi & Visite in Loco';
    doc.text(detailTitle, margin, 22);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_SLATE_MID);
    doc.text(`${filteredSopralluoghi.length} eventi nel periodo selezionato`, margin, 28);

    autoTable(doc, {
      startY: 32,
      head: [['Data / Ora', 'Tipo', 'Lead / Indirizzo', 'Tipologia', 'Agente', 'Telefonista', 'Stato / Esito', 'Note & Dettagli']],
      body: filteredSopralluoghi.map(item => [
        item.dateTime ? new Date(item.dateTime).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-',
        item.category === 'sopralluogo_fatto' ? 'FATTO' : 'FISSATO',
        sanitizePdfText(item.leadName) + (item.leadAddress ? `\n${sanitizePdfText(item.leadAddress)}` : '') + (item.leadPhone ? `\nTel: ${sanitizePdfText(item.leadPhone)}` : ''),
        sanitizePdfText(item.leadServices.join(', ')),
        sanitizePdfText(item.vendor),
        sanitizePdfText(item.colleague),
        sanitizePdfText(item.status),
        sanitizePdfText([
          item.kwpSystem ? `${item.kwpSystem} kWp` : '',
          item.hasHeatPump ? 'Pompa di Calore' : '',
          item.contractValue ? `€ ${item.contractValue.toLocaleString('it-IT')}` : '',
          item.notes
        ].filter(Boolean).join(' | ')),
      ]),
      theme: 'striped',
      margin: { left: margin, right: margin, bottom: 15 },
      styles: { fontSize: 7, cellPadding: 2.2, overflow: 'linebreak' },
      headStyles: { fillColor: BRAND_SLATE_DARK, textColor: WHITE, fontStyle: 'bold', halign: 'center', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center', textColor: BRAND_SLATE_MID },
        1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 32, fontStyle: 'bold', textColor: BRAND_INDIGO },
        3: { cellWidth: 20 },
        4: { cellWidth: 18, fontStyle: 'bold' },
        5: { cellWidth: 18 },
        6: { cellWidth: 24, halign: 'center' },
        7: { cellWidth: 'auto' }, 
      },
      alternateRowStyles: { fillColor: BRAND_SLATE_LIGHT },
      rowPageBreak: 'avoid',
      didDrawPage: () => { drawSectionHeader(); },
    });

    const totalPgs = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPgs; i++) {
      doc.setPage(i);
      drawFooter(i, totalPgs);
    }
    doc.setPage(1);
    drawCoverHeader();

    const fileNameSuffix = selectedColleagues.length === 1
      ? `_${selectedColleagues[0].replace(/[^a-zA-Z0-9]/g, '_')}`
      : selectedColleagues.length > 1 ? '_Selezionati' : '';

    doc.save(`SolarBrand_Report_Sopralluoghi${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ── PDF EXPORT STANDARD ATTIVITÀ ─────────────────────────────────────────────
  const exportHistoryPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;
    const genStr = new Date().toLocaleString('it-IT');

    const drawCoverHeader = () => {
      doc.setFillColor(...BRAND_INDIGO);
      doc.rect(0, 0, pageW, 48, 'F');
      // Logo circle
      doc.setFillColor(...BRAND_AMBER);
      doc.circle(margin + 8, 12, 6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...WHITE);
      doc.text('SB', margin + 8, 13.5, { align: 'center' });
      // Brand name
      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
      doc.text('SolarBrand', margin + 18, 14);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(199, 210, 254);
      doc.text('Gestionale Commerciale', margin + 18, 20);
      // Main title
      doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
      const mainTitleStr = selectedColleagues.length === 1 ? `Report: ${selectedColleagues[0]}` : 'Report Attività';
      doc.text(mainTitleStr, margin, 36);
      doc.setFontSize(12); doc.text('Commerciale', margin, 43);
    };

    const drawSectionHeader = () => {
      doc.setFillColor(...BRAND_INDIGO);
      doc.rect(0, 0, pageW, 12, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(199, 210, 254);
      const secHeaderStr = selectedColleagues.length === 1 ? `SolarBrand — Report Attività (${selectedColleagues[0]})` : 'SolarBrand — Report Attività Commerciale';
      doc.text(secHeaderStr, margin, 8);
    };

    const drawFooter = (pageNum: number, totalPgs: number) => {
      doc.setFillColor(...BRAND_SLATE_LIGHT);
      doc.rect(0, pageH - 10, pageW, 10, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...BRAND_SLATE_MID);
      doc.text('SolarBrand — Documento Riservato', margin, pageH - 4);
      doc.text(`Generato il ${genStr}`, pageW / 2, pageH - 4, { align: 'center' });
      doc.text(`Pag. ${pageNum} di ${totalPgs}`, pageW - margin, pageH - 4, { align: 'right' });
    };

    // ── PAGE 1: Cover ─────────────────────────────────────────────────────────
    drawCoverHeader();

    // Meta info card
    doc.setFillColor(...WHITE);
    doc.roundedRect(margin, 54, contentW, 42, 3, 3, 'F');
    doc.setDrawColor(224, 231, 255);
    doc.roundedRect(margin, 54, contentW, 42, 3, 3, 'S');

    const periodFrom = dateFrom ? new Date(dateFrom).toLocaleDateString('it-IT') : 'Inizio';
    const periodTo = dateTo ? new Date(dateTo).toLocaleDateString('it-IT') : 'Oggi';
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_MID);
    doc.text('PERIODO DI RIFERIMENTO', margin + 6, 63);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_DARK);
    doc.text(`${periodFrom}  —  ${periodTo}`, margin + 6, 72);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_SLATE_MID);
    const filterDesc = [
      selectedColleagues.length > 0 ? `Operatore/Agente: ${selectedColleagues.join(', ')}` : 'Tutti gli operatori ed agenti',
      selectedServices.length > 0 ? `Tipologie: ${selectedServices.join(', ')}` : 'Tutte le tipologie'
    ].join('   •   ');
    doc.text(filterDesc, margin + 6, 82);
    doc.text(`Generato il: ${genStr}`, margin + 6, 89);

    // ── KPI Cards ─────────────────────────────────────────────────────────────
    const totalActivities = filteredHistory.length;
    const uniqueLeads = new Set(filteredHistory.map(i => i.leadName)).size;
    const appointmentsCount = filteredHistory.filter(i => i.type === 'appointment' || (i.note && i.note.includes('[APPUNTAMENTO FISSATO]'))).length;
    const convRate = totalActivities > 0 ? Math.round((appointmentsCount / totalActivities) * 100) : 0;

    const kpis: { label: string; value: string; color: [number, number, number] }[] = [
      { label: 'Totale Attività', value: String(totalActivities), color: BRAND_INDIGO },
      { label: 'Contatti Lavorati', value: String(uniqueLeads), color: BRAND_INDIGO },
      { label: 'Appuntamenti', value: String(appointmentsCount), color: BRAND_EMERALD },
      { label: 'Tasso Conversione', value: `${convRate}%`, color: BRAND_AMBER },
    ];

    const kpiY = 106;
    const kpiW = (contentW - 9) / 4;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_DARK);
    doc.text('Riepilogo Statistico', margin, kpiY - 4);

    kpis.forEach((kpi, i) => {
      const x = margin + i * (kpiW + 3);
      doc.setFillColor(...kpi.color);
      doc.roundedRect(x, kpiY, kpiW, 22, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...WHITE);
      doc.text(kpi.value, x + kpiW / 2, kpiY + 11, { align: 'center' });
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(kpi.label.toUpperCase(), x + kpiW / 2, kpiY + 18, { align: 'center' });
    });

    // ── Riepilogo per Operatore ───────────────────────────────────────────────
    const riepilogoY = kpiY + 32;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_DARK);
    doc.text('Riepilogo per Operatore / Agente', margin, riepilogoY);

    const byColleague: Record<string, { calls: number; apts: number; emails: number; notes: number; leads: Set<string> }> = {};
    filteredHistory.forEach(item => {
      const n = item.colleague || 'N.D.';
      if (!byColleague[n]) byColleague[n] = { calls: 0, apts: 0, emails: 0, notes: 0, leads: new Set() };
      if (item.type === 'call') byColleague[n].calls++;
      else if (item.type === 'appointment' || (item.note && item.note.includes('[APPUNTAMENTO FISSATO]'))) byColleague[n].apts++;
      else if (item.type === 'email') byColleague[n].emails++;
      else byColleague[n].notes++;
      byColleague[n].leads.add(item.leadName);
    });

    autoTable(doc, {
      startY: riepilogoY + 3,
      head: [['Operatore / Agente', 'Chiamate', 'Appuntamenti', 'Email', 'Note', 'Lead Unici', 'Totale']],
      body: Object.entries(byColleague).map(([name, d]) => [
        name, String(d.calls), String(d.apts), String(d.emails), String(d.notes), String(d.leads.size),
        String(d.calls + d.apts + d.emails + d.notes)
      ]),
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: BRAND_INDIGO, textColor: WHITE, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: BRAND_SLATE_DARK },
        1: { halign: 'center' }, 2: { halign: 'center', textColor: BRAND_EMERALD },
        3: { halign: 'center' }, 4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' },
        6: { halign: 'center', fontStyle: 'bold', textColor: BRAND_INDIGO },
      },
      alternateRowStyles: { fillColor: BRAND_INDIGO_LIGHT },
      rowPageBreak: 'avoid',
      didDrawPage: (data) => { if (data.pageNumber > 1) drawSectionHeader(); },
    });

    // ── Riepilogo per Servizio ─────────────────────────────────────────────────
    const afterColY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_SLATE_DARK);
    doc.text('Riepilogo per Servizio / Prodotto', margin, afterColY);

    const byService: Record<string, { acts: number; apts: number; leads: Set<string> }> = {};
    filteredHistory.forEach(item => {
      const srvList = item.leadServices?.length > 0 ? item.leadServices : [item.leadService || 'N.D.'];
      srvList.forEach(srv => {
        const k = srv || 'N.D.';
        if (!byService[k]) byService[k] = { acts: 0, apts: 0, leads: new Set() };
        byService[k].acts++;
        if (item.type === 'appointment' || (item.note && item.note.includes('[APPUNTAMENTO FISSATO]'))) byService[k].apts++;
        byService[k].leads.add(item.leadName);
      });
    });

    autoTable(doc, {
      startY: afterColY + 3,
      head: [['Servizio / Prodotto', 'N° Attività', 'Lead Coinvolti', 'Appuntamenti', 'Tasso Conv.']],
      body: Object.entries(byService)
        .sort((a, b) => b[1].acts - a[1].acts)
        .map(([srv, d]) => [
          srv, String(d.acts), String(d.leads.size), String(d.apts),
          d.acts > 0 ? `${Math.round((d.apts / d.acts) * 100)}%` : '0%'
        ]),
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] as [number, number, number], textColor: WHITE, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: BRAND_SLATE_DARK },
        1: { halign: 'center' }, 2: { halign: 'center' },
        3: { halign: 'center', textColor: BRAND_EMERALD },
        4: { halign: 'center', fontStyle: 'bold', textColor: BRAND_AMBER },
      },
      alternateRowStyles: { fillColor: [240, 253, 244] as [number, number, number] },
      rowPageBreak: 'avoid',
      didDrawPage: (data) => { if (data.pageNumber > 1) drawSectionHeader(); },
    });

    // ── Dettaglio Attività (nuova pagina) ─────────────────────────────────────
    doc.addPage();
    drawSectionHeader();

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_INDIGO);
    const detailTitle = selectedColleagues.length === 1 ? `Dettaglio Attività — ${selectedColleagues[0]}` : 'Dettaglio Attività';
    doc.text(detailTitle, margin, 22);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_SLATE_MID);
    doc.text(`${filteredHistory.length} attività nel periodo selezionato`, margin, 28);

    autoTable(doc, {
      startY: 32,
      head: [['Data / Ora', 'Operatore', 'Lead / Azienda', 'Servizio', 'Tipo', 'Stato', 'Note / Esito']],
      body: filteredHistory.map(item => [
        new Date(item.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
        sanitizePdfText(item.colleague),
        sanitizePdfText(item.leadName) + (item.leadCompany ? `\n${sanitizePdfText(item.leadCompany)}` : ''),
        sanitizePdfText(item.leadServices?.join(', ') || item.leadService),
        item.type === 'call' ? 'Chiamata' : item.type === 'appointment' ? 'Appuntamento' : item.type === 'email' ? 'Email' : item.type === 'visit_report' ? 'Sopralluogo' : 'Nota',
        sanitizePdfText(item.statusAfterCall),
        sanitizePdfText(item.note),
      ]),
      theme: 'striped',
      margin: { left: margin, right: margin, bottom: 15 },
      styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: BRAND_SLATE_DARK, textColor: WHITE, fontStyle: 'bold', halign: 'center', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center', textColor: BRAND_SLATE_MID },
        1: { cellWidth: 20, fontStyle: 'bold', textColor: BRAND_SLATE_DARK },
        2: { cellWidth: 32, fontStyle: 'bold', textColor: BRAND_INDIGO },
        3: { cellWidth: 26 },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 'auto' }, 
      },
      alternateRowStyles: { fillColor: BRAND_SLATE_LIGHT },
      rowPageBreak: 'avoid',
      didDrawPage: () => { drawSectionHeader(); },
    });

    const totalPgs = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPgs; i++) {
      doc.setPage(i);
      drawFooter(i, totalPgs);
    }
    doc.setPage(1);
    drawCoverHeader();

    const fileNameSuffix = selectedColleagues.length === 1
      ? `_${selectedColleagues[0].replace(/[^a-zA-Z0-9]/g, '_')}`
      : selectedColleagues.length > 1 ? '_Selezionati' : '';

    doc.save(`SolarBrand_Report${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportPDF = () => {
    if (reportScope === 'sopralluoghi') {
      exportSopralluoghiPDF();
    } else {
      exportHistoryPDF();
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────────
  const vendorsList = colleagues.filter(c => c.role === 'venditore');
  const officeList = colleagues.filter(c => c.role !== 'venditore');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header with Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Report &amp; Esportazione
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {reportScope === 'sopralluoghi'
              ? 'Filtro attivo: visualizzazione e download focalizzati su Sopralluoghi ed Appuntamenti in loco'
              : 'Analisi storica completa e download dati filtrati per agente/operatore'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleExportExcel}
            disabled={currentItemsCount === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              currentItemsCount === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : reportScope === 'sopralluoghi'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            {reportScope === 'sopralluoghi' ? `Excel Sopralluoghi (${currentItemsCount})` : `Excel (${currentItemsCount})`}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={currentItemsCount === 0}
            title={reportScope === 'sopralluoghi'
              ? "Genera PDF professionale con statistiche, riepilogo per agente e telefonista, e dettaglio sopralluoghi in loco"
              : "Genera PDF professionale con copertina, KPI, riepilogo per operatore e tipologia, e dettaglio completo"
            }
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              currentItemsCount === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : reportScope === 'sopralluoghi'
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200/50'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50'
            }`}
          >
            <FileDown className="w-4 h-4" />
            {reportScope === 'sopralluoghi' ? 'PDF Sopralluoghi' : 'PDF Professionale'}
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
        
        {/* SELETTORE PRINCIPALE: Tutte le attività VS Solo Sopralluoghi & Appuntamenti in loco */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                🎯 Ambito del Report &amp; Esportazione
              </span>
              <h3 className="text-sm font-black text-slate-800">
                Scegli i dati da filtrare e scaricare:
              </h3>
            </div>

            {/* Segmented Control */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setReportScope('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  reportScope === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋</span>
                <span>Tutte le Attività</span>
              </button>

              <button
                type="button"
                onClick={() => setReportScope('sopralluoghi')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  reportScope === 'sopralluoghi'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏠</span>
                <span>Solo Sopralluoghi &amp; In Loco</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  reportScope === 'sopralluoghi' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {allSopralluoghiItems.length}
                </span>
              </button>
            </div>
          </div>

          {/* Sotto-filtro per la modalità Sopralluoghi */}
          {reportScope === 'sopralluoghi' && (
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Mostra:</span>
                <button
                  type="button"
                  onClick={() => setSopralluoghiSubFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    sopralluoghiSubFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tutti ({allSopralluoghiItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSopralluoghiSubFilter('fatti')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                    sopralluoghiSubFilter === 'fatti'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <span>✅</span> Sopralluoghi Fatti (Effettuati)
                </button>
                <button
                  type="button"
                  onClick={() => setSopralluoghiSubFilter('fissati')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                    sopralluoghiSubFilter === 'fissati'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <span>🏠</span> Appuntamenti Fissati (In programma)
                </button>
              </div>

              <span className="text-[11px] text-amber-900 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
                📍 Esportazione focalizzata solo sui sopralluoghi in loco e appuntamenti per agenti
              </span>
            </div>
          )}
        </div>
        
        {/* Quick Select Dropdown for single agent */}
        <div className="bg-white border border-indigo-100 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <label className="text-xs font-extrabold text-indigo-900 block">🎯 Selezione Rapida Agente / Operatore</label>
            <p className="text-[11px] text-slate-500 font-medium">Scegli per chi generare l'esportazione PDF o Excel</p>
          </div>
          <select
            value={selectedColleagues.length === 1 ? selectedColleagues[0] : selectedColleagues.length === 0 ? 'ALL' : 'MULTI'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'ALL') setSelectedColleagues([]);
              else if (val !== 'MULTI') setSelectedColleagues([val]);
            }}
            className="bg-indigo-50/70 border border-indigo-200 text-indigo-950 font-bold text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
          >
            <option value="ALL">👥 Tutti gli Agenti e Telefonisti ({colleagues.length})</option>
            <optgroup label="💼 Agenti Commerciali">
              {vendorsList.map(v => (
                <option key={v.id} value={v.name}>💼 {v.name} (Agente)</option>
              ))}
            </optgroup>
            <optgroup label="📞 Operatori Ufficio">
              {officeList.map(o => (
                <option key={o.id} value={o.name}>📞 {o.name} (Ufficio)</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Da Data</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">A Data</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800" />
          </div>
        </div>

        {/* Colleagues Pill Buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Filtra Multiplo per Operatore / Agente</label>
            {selectedColleagues.length > 0 && (
              <button
                onClick={() => setSelectedColleagues([])}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Mostra Tutti
              </button>
            )}
          </div>

          <div className="space-y-2">
            {vendorsList.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">💼 Agenti Commerciali:</span>
                <div className="flex flex-wrap gap-1.5">
                  {vendorsList.map(c => {
                    const isSelected = selectedColleagues.includes(c.name);
                    return (
                      <button key={c.id} onClick={() => toggleColleague(c.name)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                        }`}>
                        <span>💼</span> {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {officeList.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">📞 Operatori Ufficio (Telefonisti):</span>
                <div className="flex flex-wrap gap-1.5">
                  {officeList.map(c => {
                    const isSelected = selectedColleagues.includes(c.name);
                    return (
                      <button key={c.id} onClick={() => toggleColleague(c.name)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-50'
                        }`}>
                        <span>📞</span> {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tipologia Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Filtra per Tipologia</label>
          <div className="flex flex-wrap gap-1.5">
            {services.map(srv => {
              const isSelected = selectedServices.includes(srv);
              return (
                <button key={srv} onClick={() => toggleService(srv)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}>
                  {srv}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Elaborazione report in corso...</div>
      ) : currentItemsCount === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Nessun dato trovato con i criteri selezionati.</div>
      ) : reportScope === 'sopralluoghi' ? (
        /* TABELLA FOCALIZZATA SU SOPRALLUOGHI */
        <div className="overflow-x-auto border border-amber-200/70 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-amber-50/80 border-b border-amber-200 text-slate-600 font-bold uppercase text-[11px]">
                <th className="p-3">Data e Ora</th>
                <th className="p-3">Tipo Evento</th>
                <th className="p-3">Lead / Indirizzo</th>
                <th className="p-3">Tipologia</th>
                <th className="p-3">Agente Commerciale</th>
                <th className="p-3">Fissato da (Telefonista)</th>
                <th className="p-3">Stato / Esito</th>
                <th className="p-3">Dettagli Tecnici &amp; Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSopralluoghi.map(item => (
                <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                    {item.dateTime ? new Date(item.dateTime).toLocaleString('it-IT') : '-'}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold inline-flex items-center gap-1 ${
                      item.category === 'sopralluogo_fatto'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      <span>{item.category === 'sopralluogo_fatto' ? '✅' : '🏠'}</span>
                      {item.categoryLabel}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{item.leadName}</div>
                    {item.leadCompany && <div className="text-[10px] text-slate-400 font-medium">{item.leadCompany}</div>}
                    {item.leadAddress && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                        <span>{item.leadAddress}</span>
                      </div>
                    )}
                    {item.leadPhone && (
                      <div className="text-[10px] text-emerald-700 flex items-center gap-0.5 mt-0.5">
                        <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>{item.leadPhone}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600 font-medium">
                    {item.leadServices.join(', ') || '-'}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 text-[11px] inline-block">
                      💼 {item.vendor || 'Non assegnato'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[11px] inline-block">
                      📞 {item.colleague || 'Ufficio'}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-block ${
                      item.outcome === 'contratto_firmato'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : item.category === 'sopralluogo_fatto'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : item.status.includes('Non') || item.status.includes('Annullato')
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.status}
                    </span>
                    {item.contractValue > 0 && (
                      <div className="text-[11px] font-black text-emerald-600 mt-1">
                        € {item.contractValue.toLocaleString('it-IT')}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs text-[11px]">
                    <div className="line-clamp-2" title={item.notes}>
                      {item.kwpSystem ? <span className="font-bold text-slate-800 mr-1.5">⚡ {item.kwpSystem} kWp</span> : null}
                      {item.hasHeatPump ? <span className="font-bold text-orange-600 mr-1.5">🔥 PdC</span> : null}
                      {item.notes || '-'}
                    </div>
                    {item.nextAction && (
                      <div className="text-[10px] text-indigo-600 font-semibold mt-0.5 truncate" title={item.nextAction}>
                        ➜ {item.nextAction}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* TABELLA STANDARD TUTTE LE ATTIVITÀ */
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase">
                <th className="p-3">Data e Ora</th>
                <th className="p-3">Operatore</th>
                <th className="p-3">Lead / Contatto</th>
                <th className="p-3">Tipologie</th>
                <th className="p-3">Stato Assegnato</th>
                <th className="p-3">Note / Esito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString('it-IT')}
                  </td>
                  <td className="p-3 font-bold text-slate-800">{item.colleague || '-'}</td>
                  <td className="p-3">
                    <div className="font-bold text-indigo-600">{item.leadName}</div>
                    {item.leadCompany && <div className="text-[10px] text-slate-400">{item.leadCompany}</div>}
                  </td>
                  <td className="p-3 text-slate-600">
                    {item.leadServices?.join(', ') || item.leadService || '-'}
                  </td>
                  <td className="p-3">
                    {item.statusAfterCall ? (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {item.statusAfterCall}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs truncate" title={item.note}>
                    {item.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
