import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Lead, HistoryItem, Colleague } from '../types';
import { Download, FileText, FileDown } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [leads]);

  const loadData = async () => {
    setLoading(true);
    try {
      let allHistory: EnrichedHistory[] = [];
      for (const lead of leads) {
        try {
          const items = await api.getHistory(lead.id);
          items.forEach((item: HistoryItem) => {
            allHistory.push({
              ...item,
              leadName: lead.name,
              leadCompany: lead.company || '',
              leadService: lead.service || '',
              leadServices: lead.services || (lead.service ? [lead.service] : [])
            });
          });
        } catch (e) {
          console.error(`Error loading history for lead ${lead.id}:`, e);
        }
      }
      allHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistoryItems(allHistory);
    } catch (err) {
      console.error('Error loading report history:', err);
    } finally {
      setLoading(false);
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

  const filteredHistory = historyItems.filter(item => {
    if (selectedColleagues.length > 0 && !selectedColleagues.includes(item.colleague)) return false;
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

  // ── EXCEL EXPORT ─────────────────────────────────────────────────────────────

  const exportToExcel = () => {
    const dataToExport = filteredHistory.map(item => ({
      'Data e Ora': new Date(item.timestamp).toLocaleString('it-IT'),
      'Operatore': item.colleague || 'Nessuno',
      'Lead / Contatto': item.leadName,
      'Azienda': item.leadCompany,
      'Servizi': item.leadServices?.join(', ') || item.leadService,
      'Tipo Attività': item.type === 'call' ? 'Chiamata' : item.type === 'email' ? 'Email' : 'Nota',
      'Stato Assegnato': item.statusAfterCall || '-',
      'Dettagli / Nota': item.note || '-'
    }));
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Report Attività');
    writeFile(workbook, `Report_Attivita_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Helper to remove unsupported Unicode emojis/symbols that corrupt jsPDF Helvetica font
  const sanitizePdfText = (str: string | null | undefined): string => {
    if (!str) return '-';
    return str
      // Replace common emojis/symbols with clean text equivalents
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
      // Remove any other 4-byte unicode characters (emojis)
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();
  };

  // ── PDF EXPORT ────────────────────────────────────────────────────────────────

  const exportToPDF = () => {
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
      selectedServices.length > 0 ? `Servizi: ${selectedServices.join(', ')}` : 'Tutti i servizi'
    ].join('   •   ');
    doc.text(filterDesc, margin + 6, 82);
    doc.text(`Generato il: ${genStr}`, margin + 6, 89);

    // ── KPI Cards ─────────────────────────────────────────────────────────────
    const totalActivities = filteredHistory.length;
    const uniqueLeads = new Set(filteredHistory.map(i => i.leadName)).size;
    const appointments = filteredHistory.filter(i => i.type === 'appointment').length;
    const convRate = totalActivities > 0 ? Math.round((appointments / totalActivities) * 100) : 0;

    const kpis: { label: string; value: string; color: [number, number, number] }[] = [
      { label: 'Totale Attività', value: String(totalActivities), color: BRAND_INDIGO },
      { label: 'Contatti Lavorati', value: String(uniqueLeads), color: BRAND_INDIGO },
      { label: 'Appuntamenti', value: String(appointments), color: BRAND_EMERALD },
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
      else if (item.type === 'appointment') byColleague[n].apts++;
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
        if (item.type === 'appointment') byService[k].apts++;
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
        item.type === 'call' ? 'Chiamata' : item.type === 'appointment' ? 'Appuntamento' : item.type === 'email' ? 'Email' : 'Nota',
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
      didDrawPage: (data) => { drawSectionHeader(); },
    });

    // ── Draw footers cleanly on all pages ─────────────────────────────────────
    const totalPgs = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPgs; i++) {
      doc.setPage(i);
      drawFooter(i, totalPgs);
    }
    // Re-render cover header on page 1
    doc.setPage(1);
    drawCoverHeader();

    const fileNameSuffix = selectedColleagues.length === 1
      ? `_${selectedColleagues[0].replace(/[^a-zA-Z0-9]/g, '_')}`
      : selectedColleagues.length > 1 ? '_Selezionati' : '';

    doc.save(`SolarBrand_Report${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
  };


  // ── RENDER ────────────────────────────────────────────────────────────────────

  const vendorsList = colleagues.filter(c => c.role === 'venditore');
  const officeList = colleagues.filter(c => c.role !== 'venditore');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Report &amp; Esportazione Attività
          </h2>
          <p className="text-xs text-slate-400 font-medium">Analisi storica e download dati filtrati per agente/operatore</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={exportToExcel}
            disabled={filteredHistory.length === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              filteredHistory.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            Excel ({filteredHistory.length})
          </button>

          <button
            onClick={exportToPDF}
            disabled={filteredHistory.length === 0}
            title="Genera PDF professionale con copertina, KPI, riepilogo per operatore e servizio, e dettaglio completo"
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              filteredHistory.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50'
            }`}
          >
            <FileDown className="w-4 h-4" />
            PDF Professionale
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
        
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
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">📞 Operatori Ufficio:</span>
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


        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Filtra per Servizio</label>
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
        <div className="text-center py-12 text-slate-400 text-sm">Elaborazione report...</div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Nessun dato trovato con i criteri selezionati.</div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase">
                <th className="p-3">Data e Ora</th>
                <th className="p-3">Operatore</th>
                <th className="p-3">Lead / Contatto</th>
                <th className="p-3">Servizi</th>
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
