import React, { useState } from 'react';
import { X, CheckCircle, FileText, Zap, Home, Building2, Flame, AlertCircle, Check, ShieldAlert, Upload, FileCheck, Smartphone, Send, MapPin, ExternalLink } from 'lucide-react';
import { Appointment, Lead } from '../types';
import { api } from '../lib/api';

interface Props {
  appointment: Appointment;
  lead?: Lead;
  vendorName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function VisitReportForm({ appointment, lead, vendorName, onClose, onSaved }: Props) {
  // 1. Spunta Esito Effettivo Visita (Inizialmente deselezionato per obbligo di scelta dell'agente)
  const [visitStatus, setVisitStatus] = useState<'effettuato' | 'non_effettuato' | null>(null);
  
  // 2. Tipo Cliente: Residenziale vs Azienda
  const [clientType, setClientType] = useState<'residenziale' | 'azienda'>(
    lead?.company ? 'azienda' : 'residenziale'
  );

  // 3. Striscetta Potenza in kW
  const [kwpSystem, setKwpSystem] = useState<string>('20');

  // 4. Spunta Pompa di Calore
  const [hasHeatPump, setHasHeatPump] = useState<boolean>(false);

  // 5. Gestione Consegna Preventivo per Erika/Ufficio
  const [hasDeliveredQuote, setHasDeliveredQuote] = useState<boolean>(true);
  const [quoteDeliveryMethod, setQuoteDeliveryMethod] = useState<'whatsapp' | 'cartaceo' | 'email'>('whatsapp');
  const [quoteFileName, setQuoteFileName] = useState<string>('');
  const [quoteFileData, setQuoteFileData] = useState<string>('');

  // 6. Esito Commerciale Trattativa
  const [outcome, setOutcome] = useState<string>('trattativa_in_corso');
  const [contractValue, setContractValue] = useState<string>('');

  // 7. Note Libere & Dettagli
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQuoteFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setQuoteFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitStatus) {
      return alert('Seleziona prima se il sopralluogo è stato EFFETTUATO oppure NON EFFETTUATO.');
    }
    if (visitStatus === 'effettuato') {
      setShowConfirmModal(true);
    } else {
      processSubmit();
    }
  };

  const processSubmit = async () => {
    if (!visitStatus) return;
    setShowConfirmModal(false);
    setLoading(true);

    try {
      await api.createVisitReport({
        appointmentId: appointment.id,
        leadId: appointment.leadId,
        vendorName,
        visitDate: new Date().toISOString(),
        visitStatus,
        clientType,
        kwpSystem: Number(kwpSystem) || 0,
        hasHeatPump,
        outcome: visitStatus === 'non_effettuato' ? 'non_interessato' : outcome,
        contractValue: outcome === 'contratto_firmato' ? Number(contractValue) || 0 : 0,
        notes,
        quoteStatus: hasDeliveredQuote ? 'consegnato' : 'nessuno',
        quoteDeliveryMethod: hasDeliveredQuote ? quoteDeliveryMethod : '',
        quoteFileName: hasDeliveredQuote ? quoteFileName : '',
        quoteFileData: hasDeliveredQuote ? quoteFileData : '',
        quoteDeliveredAt: hasDeliveredQuote ? new Date().toISOString() : '',
      });

      onSaved();
    } catch (err: any) {
      alert(err.message || 'Errore durante il salvataggio del report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-md shadow-amber-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Scheda Sopralluogo & Preventivo</h2>
              <p className="text-xs text-slate-500 font-medium">
                Cliente: <strong>{appointment.leadName}</strong> {lead?.company ? `(${lead.company})` : ''}
              </p>
              {lead?.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(lead.address)}&t=k`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg w-fit transition-colors group cursor-pointer"
                  title="Apri in Google Maps (Vista Satellitare)"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="truncate max-w-[240px]">{lead.address}</span>
                  <ExternalLink className="w-3 h-3 opacity-60 ml-0.5 flex-shrink-0" />
                </a>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. SEZIONE FONDAMENTALE: SPUNTA EFFETTUATO / NON EFFETTUATO */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
              1. Stato Effettivo del Sopralluogo *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisitStatus('effettuato')}
                className={`p-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  visitStatus === 'effettuato'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.01]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>SÌ, SOPRALLUOGO FATTO</span>
              </button>

              <button
                type="button"
                onClick={() => setVisitStatus('non_effettuato')}
                className={`p-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  visitStatus === 'non_effettuato'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20 scale-[1.01]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
                <span>NO, NON EFFETTUATO</span>
              </button>
            </div>
          </div>

          {visitStatus === 'effettuato' && (
            <>
              {/* 2. SEZIONE TIPO CLIENTE: RESIDENZIALE O AZIENDA */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  2. Tipologia Cliente / Immobile *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setClientType('residenziale')}
                    className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      clientType === 'residenziale'
                        ? 'bg-blue-50 text-blue-800 border-blue-500 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Home className="w-4 h-4 text-blue-600" />
                    <span>Casa Privata (Residenziale)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClientType('azienda')}
                    className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      clientType === 'azienda'
                        ? 'bg-purple-50 text-purple-800 border-purple-500 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Azienda / Impresa</span>
                  </button>
                </div>
              </div>

              {/* 3. STRISCETTA KW & POMPA DI CALORE */}
              <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    3. Potenza Impianto Richiesta (kW) *
                  </label>
                  <span className="text-[11px] font-bold text-amber-700">Specificare i kWp</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Striscetta kW */}
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      placeholder="es. 20 kW o 100 kW"
                      value={kwpSystem}
                      onChange={e => setKwpSystem(e.target.value)}
                      className="w-full bg-white border border-amber-300 text-slate-900 text-sm font-extrabold rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-black text-amber-600">kWp</span>
                  </div>

                  {/* Spunta Pompa di Calore */}
                  <label className="flex items-center gap-3 bg-white border border-amber-300 rounded-xl p-3 cursor-pointer hover:bg-amber-50/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasHeatPump}
                      onChange={e => setHasHeatPump(e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 border-amber-300 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-extrabold text-slate-800">Interessato anche a Pompa di Calore</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. SEZIONE SPECIALE: REGISTRA & ALLEGA PREVENTIVO */}
              <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    4. Consegna del Preventivo (Per Informare Erika e l'Ufficio)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDeliveredQuote}
                      onChange={e => setHasDeliveredQuote(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-extrabold text-indigo-800">Preventivo Consegnato!</span>
                  </label>
                </div>

                {hasDeliveredQuote && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Modalità di Consegna Usata dall'Agente:</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setQuoteDeliveryMethod('whatsapp')}
                          className={`p-2.5 rounded-xl border font-extrabold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            quoteDeliveryMethod === 'whatsapp'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>📱 Inviato WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuoteDeliveryMethod('cartaceo')}
                          className={`p-2.5 rounded-xl border font-extrabold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            quoteDeliveryMethod === 'cartaceo'
                              ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>📄 Cartaceo a Mano</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuoteDeliveryMethod('email')}
                          className={`p-2.5 rounded-xl border font-extrabold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            quoteDeliveryMethod === 'email'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                          <span>📧 Inviato via Email</span>
                        </button>
                      </div>
                    </div>

                    {/* Allega File PDF Preventivo */}
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">Allega File PDF del Preventivo (Opzionale)</span>
                      <label className="flex items-center justify-center gap-2 bg-white border border-dashed border-indigo-300 rounded-xl p-3 cursor-pointer hover:bg-indigo-50/50 transition-colors">
                        <Upload className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-700 truncate">
                          {quoteFileName ? `📄 ${quoteFileName}` : 'Carica o Allega PDF Preventivo...'}
                        </span>
                        <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. ESITO COMMERCIALE & VALORE CONTRATTO */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  5. Esito Commerciale Trattativa
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'contratto_firmato', label: '🏆 Contratto Firmato', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                    { key: 'trattativa_in_corso', label: '🟢 In Trattativa / Proposta Inviata', color: 'border-blue-500 bg-blue-50 text-blue-800' },
                    { key: 'da_ricontattare', label: '🟡 Da Richiamare', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                    { key: 'non_interessato', label: '🔴 Non Interessato', color: 'border-rose-500 bg-rose-50 text-rose-800' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setOutcome(opt.key)}
                      className={`p-3 text-xs font-bold rounded-xl border-2 text-left transition-all cursor-pointer ${
                        outcome === opt.key ? opt.color : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {outcome === 'contratto_firmato' && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5">
                    Valore Totale Contratto (€) *
                  </label>
                  <input
                    type="number"
                    placeholder="es. 25000"
                    value={contractValue}
                    onChange={e => setContractValue(e.target.value)}
                    required={outcome === 'contratto_firmato'}
                    className="w-full bg-white border border-emerald-300 text-emerald-900 text-sm font-extrabold rounded-xl px-4 py-2.5"
                  />
                </div>
              )}
            </>
          )}

          {/* 6. ANNOTAZIONI VARIE DELL'AGENTE (Visibile subito all'ufficio) */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
              Annotazioni & Note del Sopralluogo (Visibili subito a Erika e all'Ufficio)
            </label>
            <textarea
              rows={4}
              placeholder="Es: Sono stato là, il cliente vorrebbe accedere al bando regionale per azienda da 100 kW, preventivo consegnato via WhatsApp..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Invia Report & Allegati all'Ufficio
              </>
            )}
          </button>

        </form>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <Send className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">Conferma Invio Email Cliente</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Confermando la registrazione del <strong>Sopralluogo Effettuato</strong>, verrà inviata automaticamente un'email di ringraziamento a nome dell'azienda a <strong>{appointment.leadName}</strong>.
              </p>
              <p className="text-[11px] text-amber-700 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                ⚠️ Il cliente riceverà questo messaggio per confermare che l'azienda rimane a disposizione dopo la visita.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 text-xs rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={processSubmit}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 text-xs rounded-xl shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Conferma & Invia Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
