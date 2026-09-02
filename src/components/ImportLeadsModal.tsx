import React, { useState, useEffect, useRef } from 'react';
import { read, utils } from 'xlsx';
import { X, UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, Globe, MapPin, Search, Key, HelpCircle, Save, Sparkles, Send, Mail, Loader2, Eye, EyeOff, Users } from 'lucide-react';
import { Lead, Colleague } from '../types';
import { api, authFetch as fetch } from '../lib/api';

type Tab = 'file' | 'apify';
type DuplicateMode = 'skip' | 'use_existing' | 'create_new';

interface Props {
  onClose: () => void;
  services: string[];
  leads: Lead[];
  colleagues?: string[];
  colleagueObjects?: Colleague[];
  activeColleague?: string;
}

export default function ImportLeadsModal({ onClose, services, leads, colleagues = [], colleagueObjects = [], activeColleague = '' }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('file');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-md shadow-indigo-600/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Importa Lead Multi-Canale</h2>
              <p className="text-xs text-slate-500 font-medium">Carica liste da Excel/CSV oppure estrai contatti da Google Maps (Apify)</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Header */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/80">
          {[
            { key: 'file' as Tab, labelFull: '1. File Excel / CSV', labelShort: '1. Excel / CSV', icon: FileSpreadsheet },
            { key: 'apify' as Tab, labelFull: '2. Google Maps Scraper (Apify)', labelShort: '2. Google Maps', icon: MapPin },
          ].map(({ key, labelFull, labelShort, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-black border-b-2 transition-all cursor-pointer text-center ${
                activeTab === key ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{labelFull}</span>
              <span className="sm:hidden text-[11px]">{labelShort}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'file' && <FileImportTab leads={leads} services={services} colleagues={colleagues} colleagueObjects={colleagueObjects} activeColleague={activeColleague} onClose={onClose} />}
          {activeTab === 'apify' && <ApifyGoogleMapsTab services={services} colleagues={colleagues} colleagueObjects={colleagueObjects} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function FileImportTab({ leads, services, colleagues = [], colleagueObjects = [], activeColleague = '', onClose }: { leads: Lead[], services: string[], colleagues?: string[], colleagueObjects?: Colleague[], activeColleague?: string, onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({ name: '', phone: '', email: '', company: '', address: '', service: '', assignedColleague: '', assignedTelefonista: '', notes: '' });

  const venditori = colleagueObjects && colleagueObjects.length > 0
    ? colleagueObjects.filter(c => c.role === 'venditore')
    : colleagues.map(c => ({ id: c, name: c, role: 'venditore' as const }));

  const telefonisti = colleagueObjects && colleagueObjects.length > 0
    ? colleagueObjects.filter(c => c.role === 'telefonista' || !c.role)
    : colleagues.map(c => ({ id: c, name: c, role: 'telefonista' as const }));

  const [defaultColleague, setDefaultColleague] = useState<string>(
    activeColleague && venditori.some(v => v.name === activeColleague) ? activeColleague : ''
  );
  const [defaultTelefonista, setDefaultTelefonista] = useState<string>(
    activeColleague && telefonisti.some(t => t.name === activeColleague) ? activeColleague : ''
  );
  const [defaultService, setDefaultService] = useState<string>('');

  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{imported: number, updated: number, skipped: number, failed: number} | null>(null);
  const [importErrors, setImportErrors] = useState<{row: number, error?: string, duplicate?: boolean}[]>([]);
  const [importDuplicates, setImportDuplicates] = useState<{row: number, existingName?: string, matchedOn?: string}[]>([]);
  const [importedLeadIds, setImportedLeadIds] = useState<string[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('skip');
  const [showNewsletterPrompt, setShowNewsletterPrompt] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expectedFields = [
    { key: 'name', label: 'Nome / Contatto (Obbligatorio)', required: true },
    { key: 'phone', label: 'Telefono', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'company', label: 'Azienda', required: false },
    { key: 'address', label: 'Indirizzo (Via, Città)', required: false },
    { key: 'assignedColleague', label: 'Agente Commerciale (Venditore)', required: false },
    { key: 'assignedTelefonista', label: 'Telefonista (Ufficio)', required: false },
    { key: 'service', label: 'Tipologia Trattata', required: false },
    { key: 'notes', label: 'Note', required: false },
  ];

  const processFile = (selectedFile: File) => {
    const validExt = /\.(xlsx|xls|csv)$/i.test(selectedFile.name);
    if (!validExt) {
      alert("Formato non supportato. Carica un file .xlsx, .xls o .csv.");
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length > 0) {
          const headers = data[0].map(h => String(h || '').trim()).filter(Boolean);
          setColumns(headers);
          const initialMapping: Record<string, string> = { ...mapping };
          headers.forEach(h => {
            const lowerH = h.toLowerCase();
            if (lowerH.includes('nome') || lowerH.includes('contatto') || lowerH.includes('lead')) initialMapping.name = h;
            else if (lowerH.includes('tel') || lowerH.includes('cellulare') || lowerH.includes('phone')) initialMapping.phone = h;
            else if (lowerH.includes('mail') || lowerH.includes('email')) initialMapping.email = h;
            else if (lowerH.includes('azienda') || lowerH.includes('company') || lowerH.includes('ragione')) initialMapping.company = h;
            else if (lowerH.includes('indirizzo') || lowerH.includes('via') || lowerH.includes('address') || lowerH.includes('città')) initialMapping.address = h;
            else if (lowerH.includes('telefonista') || lowerH.includes('call center') || lowerH.includes('ufficio')) initialMapping.assignedTelefonista = h;
            else if (lowerH.includes('venditore') || lowerH.includes('agente') || lowerH.includes('commerciale')) initialMapping.assignedColleague = h;
            else if (lowerH.includes('operatore') || lowerH.includes('collega') || lowerH.includes('assegnato')) initialMapping.assignedColleague = h;
            else if (lowerH.includes('servizi') || lowerH.includes('service') || lowerH.includes('tipologia') || lowerH.includes('tipo')) initialMapping.service = h;
            else if (lowerH.includes('note') || lowerH.includes('messaggio')) initialMapping.notes = h;
          });
          setMapping(initialMapping);
          const rows = utils.sheet_to_json(ws) as any[];
          setRawRows(rows);
          generatePreview(rows, initialMapping, defaultColleague, defaultTelefonista, defaultService);
        }
      } catch (err) {
        alert("Errore durante la lettura del file.");
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const generatePreview = (
    rawData: any[], 
    currentMapping: Record<string, string>, 
    curColleague: string = defaultColleague, 
    curTelefonista: string = defaultTelefonista, 
    curService: string = defaultService
  ) => {
    const preview = rawData.slice(0, 5).map(row => ({
      name: row[currentMapping.name] ? String(row[currentMapping.name]) : '',
      phone: row[currentMapping.phone] ? String(row[currentMapping.phone]) : '',
      email: row[currentMapping.email] ? String(row[currentMapping.email]) : '',
      company: row[currentMapping.company] ? String(row[currentMapping.company]) : '',
      address: row[currentMapping.address] ? String(row[currentMapping.address]) : '',
      assignedColleague: (row[currentMapping.assignedColleague] ? String(row[currentMapping.assignedColleague]) : '') || curColleague,
      assignedTelefonista: (currentMapping.assignedTelefonista && row[currentMapping.assignedTelefonista] ? String(row[currentMapping.assignedTelefonista]) : '') || curTelefonista,
      service: (row[currentMapping.service] ? String(row[currentMapping.service]) : '') || curService,
      notes: row[currentMapping.notes] ? String(row[currentMapping.notes]) : '',
    }));
    setPreviewData(preview);
  };

  const handleMappingChange = (fieldKey: string, columnName: string) => {
    const newMapping = { ...mapping, [fieldKey]: columnName };
    setMapping(newMapping);
    if (rawRows.length > 0) {
      generatePreview(rawRows, newMapping, defaultColleague, defaultTelefonista, defaultService);
    }
  };

  const readFileAsBinaryString = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => resolve(evt.target?.result as string);
      reader.onerror = () => reject(reader.error || new Error('Errore durante la lettura del file'));
      reader.readAsBinaryString(f);
    });
  };

  const handleImport = async () => {
    if (!mapping.name) return alert("La colonna 'Nome / Contatto' è obbligatoria.");
    if (!file) return;
    setIsImporting(true);
    setImportProgress(10);
    try {
      const bstr = await readFileAsBinaryString(file);
      const wb = read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws) as any[];

      const leadsPayload = rows.map(row => {
        const rowColleague = (row[mapping.assignedColleague] ? String(row[mapping.assignedColleague]).trim() : '') || defaultColleague;
        const rowTelefonista = (mapping.assignedTelefonista && row[mapping.assignedTelefonista] ? String(row[mapping.assignedTelefonista]).trim() : '') || defaultTelefonista;
        const rowService = (row[mapping.service] ? String(row[mapping.service]).trim() : '') || defaultService;

        return {
          name: row[mapping.name] ? String(row[mapping.name]).trim() : '',
          phone: row[mapping.phone] ? String(row[mapping.phone]).trim() : '',
          email: row[mapping.email] ? String(row[mapping.email]).trim() : '',
          company: row[mapping.company] ? String(row[mapping.company]).trim() : '',
          address: row[mapping.address] ? String(row[mapping.address]).trim() : '',
          assignedColleague: rowColleague,
          assignedTelefonista: rowTelefonista,
          assignedTelefonisti: rowTelefonista ? [rowTelefonista] : [],
          service: rowService,
          services: rowService ? [rowService] : [],
          notes: row[mapping.notes] ? String(row[mapping.notes]).trim() : '',
        };
      }).filter(r => r.name);

      if (leadsPayload.length === 0) {
        alert("Nessuna riga valida da importare: controlla che la colonna 'Nome / Contatto' sia abbinata correttamente e che il file contenga dei dati.");
        return;
      }

      setImportProgress(50);
      const result = await api.importLeads(leadsPayload, duplicateMode);
      setImportProgress(100);
      setImportResult({ imported: result.imported, updated: result.updated, skipped: result.skipped, failed: result.failed });
      setImportErrors((result.results || []).filter((r: any) => !r.ok && !r.duplicate));
      setImportDuplicates((result.results || []).filter((r: any) => !r.ok && r.duplicate));
      // Store imported IDs for newsletter prompt
      if (result.importedIds && result.importedIds.length > 0) {
        setImportedLeadIds(result.importedIds);
      }
    } catch (err: any) {
      alert("Errore durante l'importazione: " + (err?.message || 'errore sconosciuto'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {!file && (
        <div
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
            isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="bg-indigo-50 text-indigo-500 p-4 rounded-full mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">Carica un file Excel o CSV</h3>
          <p className="text-sm text-slate-500 max-w-sm">Trascina o clicca per selezionare un file `.xlsx` o `.csv` con i tuoi contatti.</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
        </div>
      )}

      {file && !importResult && !isImporting && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700">Abbinamento Colonne File</h3>
            <button onClick={() => { setFile(null); setPreviewData([]); setColumns([]); }} className="text-xs text-indigo-600 font-semibold hover:underline">
              Cambia file
            </button>
          </div>

          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-900 leading-relaxed">
              Per ogni <strong>campo del gestionale</strong> (a sinistra) scegli, dal menu a tendina, <strong>quale colonna del tuo file</strong> contiene quel dato.
              Se il file non ha una colonna adatta lascia "Ignora colonna". Abbiamo già rilevato in automatico {columns.length} colonne (<span className="font-mono">{columns.join(', ')}</span>) e provato ad abbinarle: controlla che siano corrette nell'anteprima qui sotto prima di importare.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expectedFields.map(field => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Campo gestionale: {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-xs shrink-0">← colonna file:</span>
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white cursor-pointer"
                  >
                    <option value="">-- Ignora colonna --</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {previewData.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-700">Anteprima con l'abbinamento attuale (prime {previewData.length} righe)</h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      {expectedFields.map(f => (
                        <th key={f.key} className="px-3 py-2 whitespace-nowrap">{f.label.replace(' (Obbligatorio)', '')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {expectedFields.map(f => (
                          <td key={f.key} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[160px] truncate">
                            {(row as any)[f.key] || <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!mapping.name && (
                <p className="text-[11px] text-rose-600 font-semibold">⚠️ Nessuna colonna abbinata a "Nome / Contatto": è obbligatoria per poter importare.</p>
              )}
            </div>
          )}

          {/* Assegnazioni Predefinite & Gestione Duplicati */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Assegnazioni Predefinite &amp; Tipologia (per contatti senza colonna specifica nel file)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  I valori scelti qui verranno assegnati automaticamente a tutti i lead importati che non hanno una colonna dedicata nel file.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Agente Commerciale (Venditore) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    💼 Agente Commerciale (Venditore)
                  </label>
                  <select
                    value={defaultColleague}
                    onChange={e => {
                      const val = e.target.value;
                      setDefaultColleague(val);
                      if (rawRows.length > 0) generatePreview(rawRows, mapping, val, defaultTelefonista, defaultService);
                    }}
                    className="w-full bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Nessun Agente (Non assegnato) --</option>
                    {venditori.map(v => (
                      <option key={v.id || v.name} value={v.name}>💼 {v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Telefonista (Ufficio) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    📞 Telefonista (Ufficio / Call Center)
                  </label>
                  <select
                    value={defaultTelefonista}
                    onChange={e => {
                      const val = e.target.value;
                      setDefaultTelefonista(val);
                      if (rawRows.length > 0) generatePreview(rawRows, mapping, defaultColleague, val, defaultService);
                    }}
                    className="w-full bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Nessun Telefonista --</option>
                    {telefonisti.map(t => (
                      <option key={t.id || t.name} value={t.name}>📞 {t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tipologia Trattata */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    🏷️ Tipologia Trattata
                  </label>
                  <select
                    value={defaultService}
                    onChange={e => {
                      const val = e.target.value;
                      setDefaultService(val);
                      if (rawRows.length > 0) generatePreview(rawRows, mapping, defaultColleague, defaultTelefonista, val);
                    }}
                    className="w-full bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Nessuna Tipologia --</option>
                    {services.map(s => (
                      <option key={s} value={s}>🏷️ {s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-700">Gestione Duplicati</h4>
                <p className="text-[11px] text-slate-500">Cosa fare se un contatto ha lo stesso telefono/email di uno già in archivio?</p>
              </div>
              <select
                value={duplicateMode}
                onChange={e => setDuplicateMode(e.target.value as DuplicateMode)}
                className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 cursor-pointer min-w-[220px]"
              >
                <option value="skip">Salta Duplicati (Consigliato)</option>
                <option value="use_existing">Aggiorna Scheda Esistente</option>
                <option value="create_new">Crea Comunque Nuovo Lead</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={!mapping.name}
            className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mapping.name ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle className="w-4 h-4" /> Avvia Importazione
          </button>
        </div>
      )}

      {isImporting && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="font-bold text-slate-700">Importazione in corso... {importProgress}%</p>
        </div>
      )}

      {importResult && !showNewsletterPrompt && (
        <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full mb-2">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Importazione Completata</h3>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full max-w-md grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-600">{importResult.imported}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase">Importati</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-blue-600">{importResult.updated}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase">Aggiornati</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-amber-500">{importResult.skipped}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase">Saltati</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-rose-500">{importResult.failed}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase">Falliti</p>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="w-full max-w-md bg-rose-50 border border-rose-200 rounded-xl p-4 text-left">
              <p className="text-xs font-bold text-rose-700 mb-2">⚠️ {importResult.failed} righe non importate — dettaglio motivi:</p>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                {importErrors.slice(0, 20).map((e, i) => (
                  <p key={i} className="text-[11px] text-rose-600">
                    Riga {e.row}: {e.error || 'errore sconosciuto'}
                  </p>
                ))}
                {importErrors.length > 20 && (
                  <p className="text-[11px] text-rose-500 font-semibold">…e altre {importErrors.length - 20} righe.</p>
                )}
              </div>
            </div>
          )}

          {importDuplicates.length > 0 && (
            <div className="w-full max-w-md bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
              <p className="text-xs font-bold text-amber-700 mb-2">⏭️ {importResult.skipped} righe saltate perché già presenti in archivio:</p>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                {importDuplicates.slice(0, 20).map((d, i) => (
                  <p key={i} className="text-[11px] text-amber-700">
                    Riga {d.row}: corrisponde a "{d.existingName || 'contatto esistente'}" già in archivio (stesso {d.matchedOn || 'contatto'})
                  </p>
                ))}
                {importDuplicates.length > 20 && (
                  <p className="text-[11px] text-amber-600 font-semibold">…e altre {importDuplicates.length - 20} righe.</p>
                )}
              </div>
            </div>
          )}

          {/* Newsletter CTA */}
          <div className="w-full max-w-sm bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 text-left mt-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-violet-100 text-violet-600 p-1.5 rounded-lg"><Mail className="w-4 h-4" /></div>
              <h4 className="font-extrabold text-slate-800 text-sm">Vuoi inviare una newsletter a questi lead?</h4>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {importedLeadIds.length > 0
                ? `${importedLeadIds.length} lead con email disponibili per la campagna.`
                : `${importResult.imported + importResult.updated} lead importati — potrai selezionarli manualmente nella sezione Campagne.`
              }
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewsletterPrompt(true)}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Crea Campagna Newsletter
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer hover:bg-slate-50"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {importResult && showNewsletterPrompt && (
        <NewsletterPrompt
          leadIds={importedLeadIds}
          importCount={importResult.imported + importResult.updated}
          onClose={onClose}
          onBack={() => setShowNewsletterPrompt(false)}
        />
      )}
    </div>
  );
}

function ApifyGoogleMapsTab({ services = [], colleagues = [], colleagueObjects = [], onClose }: { services?: string[]; colleagues?: string[]; colleagueObjects?: Colleague[]; onClose: () => void }) {
  const [apifyToken, setApifyToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [industries, setIndustries] = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [limit, setLimit] = useState('10');

  const venditori = colleagueObjects && colleagueObjects.length > 0
    ? colleagueObjects.filter(c => c.role === 'venditore')
    : (colleagues || []).map(c => ({ id: c, name: c, role: 'venditore' as const }));

  const telefonisti = colleagueObjects && colleagueObjects.length > 0
    ? colleagueObjects.filter(c => c.role === 'telefonista' || !c.role)
    : (colleagues || []).map(c => ({ id: c, name: c, role: 'telefonista' as const }));

  const [assignedColleague, setAssignedColleague] = useState('');
  const [assignedTelefonista, setAssignedTelefonista] = useState('');
  const [service, setService] = useState('');
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('skip');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [foundSoFar, setFoundSoFar] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<{ 
    found: number; 
    imported: number; 
    updated?: number; 
    skipped?: number; 
    duplicates?: { row: number; existingName?: string; matchedOn?: string }[];
    importedIds?: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const [showNewsletterPrompt, setShowNewsletterPrompt] = useState(false);

  const timerRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    api.getSettings().then(settings => {
      const token = settings.apify_token || settings.apify_api_key || '';
      if (token) {
        setApifyToken(token);
        setIsTokenSaved(true);
      }
    }).catch(() => {});

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleSaveToken = async () => {
    if (!apifyToken.trim()) return alert('Inserisci il Token API di Apify');
    setSaveLoading(true);
    try {
      await api.setSetting('apify_token', apifyToken.trim());
      setIsTokenSaved(true);
      alert('✅ Token API Apify salvato con successo!');
    } catch (e: any) {
      alert('Errore durante il salvataggio: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleSearch = async () => {
    if (!industries.trim() && !keywords.trim()) {
      return alert('Inserisci il settore o la categoria di attività (es. Impianti fotovoltaici, Ristoranti, Idraulici)');
    }
    if (!location.trim()) {
      return alert('Inserisci la città o regione geografica (es. Milano, Lombardia oppure Roma)');
    }

    setLoading(true);
    setError('');
    setResult(null);
    setStatusMessage('Avvio scraper Google Maps su Apify...');
    setFoundSoFar(0);
    setElapsedSeconds(0);
    stopPolling(); // Cancel any previous polling interval

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    try {
      const startRes = await api.startApifySearch({
        industries: industries.trim(),
        locations: location.trim(),
        keywords: keywords.trim(),
        fetch_count: Number(limit) || 10,
        assignedColleague: assignedColleague || undefined,
        assignedTelefonista: assignedTelefonista || undefined,
        service: service || undefined,
        duplicateMode,
      });

      if (!startRes.ok || !startRes.runId) {
        throw new Error((startRes as any).error || 'Impossibile avviare la scansione su Apify');
      }

      setStatusMessage('Scansione Google Maps e arricchimento contatti in corso...');

      // Start Polling every 3s
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await api.getApifySearchStatus(startRes.runId);

          if (statusRes.status === 'RUNNING') {
            if (statusRes.message) setStatusMessage(statusRes.message);
            if (typeof statusRes.foundSoFar === 'number') setFoundSoFar(statusRes.foundSoFar);
          } else if (statusRes.status === 'DONE') {
            stopPolling();
            setLoading(false);
            setResult({
              found: statusRes.total || 0,
              imported: statusRes.imported || 0,
              updated: statusRes.updated || 0,
              skipped: statusRes.skipped || 0,
              duplicates: statusRes.duplicates || [],
              importedIds: statusRes.importedIds || [],
            });
          } else if (statusRes.status === 'FAILED') {
            stopPolling();
            setLoading(false);
            setError(statusRes.error || 'La scansione su Apify è fallita. Riprova controllando i parametri.');
          }
        } catch (pollErr: any) {
          console.warn('[polling Apify status error]:', pollErr);
        }
      }, 3000);

    } catch (e: any) {
      stopPolling();
      setLoading(false);
      setError(e.message || 'Errore durante la richiesta');
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 text-xs text-slate-700">
      
      {/* Idiot-proof guide */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm">
          <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Come ottenere il Token API Apify (Google Maps Scraper) in 3 Passaggi</span>
        </div>

        <ol className="list-decimal list-inside space-y-1 text-emerald-900 font-medium leading-relaxed pl-1">
          <li>Accedi al tuo account su <strong>Apify.com</strong>.</li>
          <li>Vai su <strong>Settings ➔ API &amp; Integrations ➔ API Tokens</strong> e copia il tuo <strong>Organization API Token</strong> (quello dell'organizzazione, NON il Personal).</li>
          <li>Incolla il token nel riquadro sottostante e clicca su <strong>Salva Token</strong>. Verrà memorizzato in modo sicuro per tutti i futuri utilizzi!</li>
        </ol>
      </div>

      {/* API Key Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
          <span>🔑 Token API Apify (Google Maps Scraper)</span>
          {isTokenSaved && <span className="text-emerald-600 font-extrabold text-[11px]">✓ Configurato e Attivo</span>}
        </label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type={showToken ? "text" : "password"}
              autoComplete="off"
              name="apify-organization-token"
              placeholder="Incolla qui il tuo token Apify (es. apify_api_xxxx...)"
              value={apifyToken}
              onChange={e => { setApifyToken(e.target.value); setIsTokenSaved(false); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs rounded-xl pl-10 pr-10 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title={showToken ? 'Nascondi token' : 'Mostra token'}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleSaveToken}
            disabled={saveLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveLoading ? 'Salvataggio...' : 'Salva Token'}
          </button>
        </div>
      </div>

      {/* Quality Badge Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-blue-900 leading-relaxed">
          <strong>Filtro Qualità Rigoroso 100%:</strong> Google Maps contiene tutte le attività territoriali reali. Lo scraper arricchisce ciascuna azienda estraendo i dati dal sito web e i referenti aziendali disponibili. Vengono ammessi nel CRM <strong>SOLO contatti con sia Email che Telefono validi</strong>.
        </div>
      </div>

      {/* Search inputs */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          Cerca Aziende e Professionisti su Google Maps
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Settore / Categoria Attività <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={industries}
              onChange={e => setIndustries(e.target.value)}
              placeholder="es. Impianti fotovoltaici, Elettricisti"
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">Tipologia di attività da cercare su Maps (separa con virgola).</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Città / Regione / Provincia <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="es. Milano, Lombardia oppure Roma"
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">Area geografica di interesse in Italia.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Keyword Opzionali / Servizi</label>
            <input
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="es. pannelli solari, pompe calore"
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">Termini aggiuntivi per affinare la ricerca.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Lead Richiesti (Email + Tel)</label>
            <select
              value={limit}
              onChange={e => setLimit(e.target.value)}
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="10">10 Lead Verificati</option>
              <option value="25">25 Lead Verificati</option>
              <option value="50">50 Lead Verificati</option>
              <option value="100">100 Lead Verificati</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Numero target di contatti completi da importare.</p>
          </div>
        </div>

        {/* Assegnazione Automatica & Tipologia Lead Estratti */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              Assegnazione Automatica &amp; Tipologia (Opzionale)
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Abbina direttamente tutti i contatti estratti da Maps a un venditore, un telefonista e una tipologia di interesse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Agente Venditore */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                💼 Assegna ad Agente Commerciale
              </label>
              <select
                value={assignedColleague}
                onChange={e => setAssignedColleague(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 cursor-pointer focus:bg-white"
              >
                <option value="">-- Nessun Agente (Non assegnato) --</option>
                {venditori.map(v => (
                  <option key={v.id || v.name} value={v.name}>💼 {v.name}</option>
                ))}
              </select>
            </div>

            {/* Telefonista */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                📞 Assegna a Telefonista (Ufficio)
              </label>
              <select
                value={assignedTelefonista}
                onChange={e => setAssignedTelefonista(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 cursor-pointer focus:bg-white"
              >
                <option value="">-- Nessun Telefonista --</option>
                {telefonisti.map(t => (
                  <option key={t.id || t.name} value={t.name}>📞 {t.name}</option>
                ))}
              </select>
            </div>

            {/* Tipologia */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                🏷️ Tipologia Trattata
              </label>
              <select
                value={service}
                onChange={e => setService(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 cursor-pointer focus:bg-white"
              >
                <option value="">-- Nessuna Tipologia --</option>
                {services.map(s => (
                  <option key={s} value={s}>🏷️ {s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Gestione Duplicati */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>🔄</span> Gestione Duplicati
            </h4>
            <p className="text-[11px] text-slate-500">Cosa fare se un'azienda estratta ha lo stesso telefono o email di un contatto già presente nel CRM?</p>
          </div>
          <select
            value={duplicateMode}
            onChange={e => setDuplicateMode(e.target.value as DuplicateMode)}
            disabled={loading}
            className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 cursor-pointer min-w-[220px]"
          >
            <option value="skip">Salta Duplicati (Consigliato)</option>
            <option value="use_existing">Aggiorna Scheda Esistente</option>
            <option value="create_new">Crea Comunque Nuovo Lead</option>
          </select>
        </div>

        {error && (
          <div className="text-xs text-rose-700 font-bold bg-rose-50 p-4 rounded-xl border border-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Loading Progress Card */}
        {loading && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <span className="font-extrabold text-emerald-950 text-sm">{statusMessage}</span>
            </div>
            <p className="text-xs text-emerald-800">
              Tempo trascorso: <strong>{elapsedSeconds}s</strong> • L'estrazione e verifica contatti richiede solitamente tra i 30 e i 90 secondi.
            </p>
            {foundSoFar > 0 && (
              <span className="bg-emerald-200 text-emerald-900 font-bold text-xs px-3 py-1 rounded-full">
                {foundSoFar} lead qualificati individuati finora
              </span>
            )}
          </div>
        )}

        {/* Success Result Card */}
        {result && !showNewsletterPrompt && (
          <div className="flex flex-col gap-3">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-emerald-950 text-sm">Estrazione da Google Maps Completata!</h4>
                  <p className="text-xs text-emerald-800">
                    Estratti <strong>{result.found}</strong> contatti qualificati da Google Maps.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">{result.imported}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase">Nuovi Importati</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">{result.updated || 0}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase">Aggiornati</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-amber-500">{result.skipped || 0}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase">Duplicati Saltati</p>
              </div>
            </div>

            {/* Dettaglio duplicati saltati */}
            {result.duplicates && result.duplicates.length > 0 && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                <p className="text-xs font-bold text-amber-700 mb-2">⏭️ {result.skipped} contatti saltati perché già presenti in archivio:</p>
                <div className="max-h-36 overflow-y-auto flex flex-col gap-1">
                  {result.duplicates.slice(0, 20).map((d, i) => (
                    <p key={i} className="text-[11px] text-amber-700">
                      #{d.row}: corrisponde a "{d.existingName || 'contatto esistente'}" già in archivio (stesso {d.matchedOn || 'contatto'})
                    </p>
                  ))}
                  {result.duplicates.length > 20 && (
                    <p className="text-[11px] text-amber-600 font-semibold">…e altri {result.duplicates.length - 20} contatti.</p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-violet-100 text-violet-600 p-1.5 rounded-lg"><Mail className="w-4 h-4" /></div>
                <h4 className="font-extrabold text-slate-800 text-xs">Vuoi inviare subito una newsletter a questi lead?</h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Puoi creare una campagna email indirizzata direttamente ai lead appena estratti con un solo click.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewsletterPrompt(true)}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Crea Campagna Newsletter
                </button>
                <button onClick={onClose} className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer">
                  Chiudi e vai ai Lead
                </button>
              </div>
            </div>
          </div>
        )}

        {result && showNewsletterPrompt && (
          <NewsletterPrompt
            leadIds={result.importedIds || []}
            importCount={result.imported}
            onClose={onClose}
            onBack={() => setShowNewsletterPrompt(false)}
          />
        )}

        {!loading && (
          <button
            onClick={handleSearch}
            disabled={!industries.trim() || !location.trim()}
            className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              industries.trim() && location.trim()
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Avvia Estrazione Lead da Google Maps
          </button>
        )}
      </div>

    </div>
  );
}

// ── NEWSLETTER PROMPT ──
interface NewsletterPromptProps {
  leadIds: string[];     // IDs of leads just imported (may be empty)
  importCount: number;   // total imported
  onClose: () => void;
  onBack: () => void;
}

function NewsletterPrompt({ leadIds, importCount, onClose, onBack }: NewsletterPromptProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [smtpAccounts, setSmtpAccounts] = useState<any[]>([]);
  const [allLeads, setAllLeads] = useState<any[]>([]);

  const [campaignName, setCampaignName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [smtpId, setSmtpId] = useState('');
  const [sendDelay, setSendDelay] = useState(3);

  // Lead selection: start with the imported IDs, allow manual refinement
  const [selectedIds, setSelectedIds] = useState<string[]>(leadIds);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [createdCampaignName, setCreatedCampaignName] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/email-templates').then(r => r.json()),
      fetch('/api/smtp-accounts').then(r => r.json()),
      fetch('/api/leads').then(r => r.json()),
    ]).then(([t, s, l]) => {
      setTemplates(t);
      setSmtpAccounts(s);
      const withEmail = l.filter((x: any) => x.email);
      setAllLeads(withEmail);
      setLoading(false);
    }).catch(err => {
      alert('Errore durante il caricamento dei dati per la newsletter: ' + (err?.message || 'errore sconosciuto'));
      setLoading(false);
    });
  }, []);

  const filteredLeads = allLeads.filter(l => {
    const q = search.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || (l.company || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q);
  });

  const toggle = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreate = async () => {
    if (!campaignName.trim()) return alert('Inserisci un nome per la campagna');
    if (!templateId) return alert('Seleziona un template email');
    if (!smtpId) return alert('Seleziona un account SMTP');
    if (selectedIds.length === 0) return alert('Seleziona almeno un lead destinatario');

    setCreating(true);
    try {
      const campRes = await fetch('/api/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName, templateId, smtpId, sendDelay }),
      });
      const campaign = await campRes.json();
      if (!campRes.ok) throw new Error(campaign.error);

      await fetch(`/api/email-campaigns/${campaign.id}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedIds }),
      });

      setCreatedCampaignName(campaign.name);
      setDone(true);
    } catch (e: any) {
      alert('Errore: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
        <div className="bg-violet-100 text-violet-600 p-4 rounded-full"><Send className="w-10 h-10" /></div>
        <h3 className="text-lg font-bold text-slate-800">Campagna Creata!</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          La campagna <strong>"{createdCampaignName}"</strong> è stata creata con <strong>{selectedIds.length}</strong> destinatari.
          Aprila dalla sezione <strong>Campagne</strong> in toolbar per avviare l'invio.
        </p>
        <button onClick={onClose} className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl cursor-pointer">
          Chiudi e vai alle Campagne
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Back button */}
      <button onClick={onBack} className="text-xs text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer self-start">
        ← Torna al riepilogo importazione
      </button>

      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Send className="w-4 h-4 text-violet-600" />
          <h3 className="font-extrabold text-slate-800 text-sm">Crea campagna newsletter per i lead importati</h3>
        </div>
        <p className="text-xs text-slate-500">
          {leadIds.length > 0
            ? `${selectedIds.length} di ${allLeads.length} lead selezionati (pre-selezionati quelli appena importati con email).`
            : `Seleziona i lead a cui vuoi inviare la newsletter.`
          }
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Caricamento...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Config */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome Campagna *</label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="es. Newsletter Agosto 2026"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Template Email *</label>
              <select
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">— Seleziona template —</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {templates.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠️ Nessun template. Creane uno nella sezione Template Email.</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Account SMTP *</label>
              <select
                value={smtpId}
                onChange={e => setSmtpId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">— Seleziona account —</option>
                {smtpAccounts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.user_email})</option>)}
              </select>
              {smtpAccounts.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠️ Nessun account SMTP configurato.</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Ritardo tra invii: <span className="text-violet-600">{sendDelay}s</span>
              </label>
              <input
                type="range" min={0} max={30} step={1} value={sendDelay}
                onChange={e => setSendDelay(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
              {creating ? 'Creazione campagna...' : `Crea Campagna (${selectedIds.length} destinatari)`}
            </button>
          </div>

          {/* Lead picker */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Destinatari ({selectedIds.length}/{allLeads.length})
              </label>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(filteredLeads.map((l: any) => l.id))} className="text-xs font-bold text-violet-600 hover:underline cursor-pointer">Tutti</button>
                <button onClick={() => setSelectedIds([])} className="text-xs font-bold text-slate-400 hover:underline cursor-pointer">Nessuno</button>
              </div>
            </div>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca lead..."
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {filteredLeads.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  {allLeads.length === 0 ? 'Nessun lead con email in archivio' : 'Nessun risultato'}
                </div>
              ) : filteredLeads.map((lead: any) => {
                const checked = selectedIds.includes(lead.id);
                const isNew = leadIds.includes(lead.id);
                return (
                  <label key={lead.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${checked ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(lead.id)} className="w-4 h-4 accent-violet-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-800 truncate">{lead.name}</p>
                        {isNew && <span className="text-[9px] font-black bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full shrink-0">NUOVO</span>}
                      </div>
                      <p className="text-[10px] text-violet-600 truncate">{lead.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
