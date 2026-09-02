import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { Lead, HistoryItem, Appointment, SmsTemplate, LeadAttachment } from '../types';
import TaskForm from './TaskForm';
import SendEmailForm from './SendEmailForm';
import { 
  X, Phone, Mail, Building, Clock, FileText, User, 
  MessageSquare, Calendar, ChevronRight, Plus, AlertCircle, Check, Trash2, Bell, Paperclip, Download, UploadCloud, File, MapPin, ExternalLink
} from 'lucide-react';

interface LeadDetailProps {
  lead: Lead;
  activeColleague: string;
  colleagues: string[];
  googleToken: string | null;
  sessionRole: 'telefonista' | 'venditore' | 'admin';
  onClose: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
  onDeleteLead?: (deletedId: string) => void;
  onTriggerGoogleLogin: () => Promise<string | null>;
}

export default function LeadDetail({ 
  lead, 
  activeColleague, 
  colleagues, 
  googleToken, 
  sessionRole,
  onClose, 
  onUpdateLead,
  onDeleteLead,
  onTriggerGoogleLogin 
}: LeadDetailProps) {
  const isVenditore = sessionRole === 'venditore';
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [showSmsDropdown, setShowSmsDropdown] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<Lead['status']>(lead.status);
  const [actionType, setActionType] = useState<'call' | 'note'>(isVenditore ? 'note' : 'call');
  const [savingAction, setSavingAction] = useState(false);

  const [calendarType, setCalendarType] = useState<'visit' | 'call'>('visit');
  const [calendarVendor, setCalendarVendor] = useState(isVenditore ? activeColleague : '');
  const [calendarTitle, setCalendarTitle] = useState(`Sopralluogo: ${lead.name}`);
  const [calendarDateTime, setCalendarDateTime] = useState('');
  const [calendarNotes, setCalendarNotes] = useState('');
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [calendarSuccess, setCalendarSuccess] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [allColleagueObjs, setAllColleagueObjs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'history' | 'schedule' | 'tasks' | 'email' | 'attachments'>('history');

  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const items = await api.getLeadAttachments(lead.id);
      setAttachments(items);
    } catch (e) {
      console.error('Error loading attachments:', e);
    } finally {
      setLoadingAttachments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attachments') {
      loadAttachments();
    }
  }, [activeTab, lead.id]);

  const readFileAsDataURL = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error || new Error('Errore durante la lettura del file'));
      reader.readAsDataURL(f);
    });
  };

  const handleUploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert('Seleziona prima un file da caricare');
    if (!attachmentDescription.trim()) return alert('Inserisci una descrizione che spieghi il contenuto del file (es. Bolletta 2° trimestre, Visura Camerale)');

    setUploadingAttachment(true);
    try {
      const fileData = await readFileAsDataURL(selectedFile);
      await api.uploadLeadAttachment(lead.id, {
        description: attachmentDescription.trim(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        uploadedBy: activeColleague || 'Ufficio',
        fileData,
      });

      setAttachmentDescription('');
      setSelectedFile(null);
      const fileInput = document.getElementById('lead-attachment-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      loadAttachments();
      const items = await api.getHistory(lead.id);
      setHistory(items);
    } catch (err: any) {
      alert('Errore durante il caricamento del file: ' + (err.message || err));
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento allegato?')) return;
    try {
      await api.deleteLeadAttachment(id);
      loadAttachments();
    } catch (e: any) {
      alert('Errore eliminazione: ' + e.message);
    }
  };

  useEffect(() => {
    api.getSmsTemplates().then(setSmsTemplates).catch(console.error);
    api.getColleagues().then(cols => {
      setAllColleagueObjs(cols);
      if (!isVenditore) {
        const v = cols.filter((c: any) => c.role === 'venditore');
        if (v.length > 0) setCalendarVendor(v[0].name);
      }
    }).catch(console.error);
  }, [isVenditore]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingHistory(true);
      try {
        const items = await api.getHistory(lead.id);
        if (active) setHistory(items);
      } catch (e) {
        console.error('Error loading history:', e);
      } finally {
        if (active) setLoadingHistory(false);
      }
    };
    load();
    setNewStatus(lead.status);
  }, [lead.id, lead.status]);

  const generateSmsLink = (templateBody: string) => {
    let body = templateBody
      .replace(/{nome}/g, lead.name)
      .replace(/{azienda}/g, lead.company || '')
      .replace(/{servizio}/g, lead.service || '');
    return `sms:${lead.phone}?body=${encodeURIComponent(body)}`;
  };

  const [showClosedConfirmModal, setShowClosedConfirmModal] = useState(false);

  const handleSaveAction = () => {
    if (newStatus === 'Chiuso con successo' && lead.status !== 'Chiuso con successo') {
      setShowClosedConfirmModal(true);
    } else {
      executeSaveAction();
    }
  };

  const executeSaveAction = async () => {
    setShowClosedConfirmModal(false);
    setSavingAction(true);
    try {
      const updatedLead = await api.updateLead(lead.id, { status: newStatus });
      onUpdateLead(updatedLead);

      if (newNote.trim()) {
        await api.addHistory(lead.id, {
          colleague: activeColleague,
          note: newNote.trim(),
          statusAfterCall: newStatus,
          type: actionType,
        });
      }

      setNewNote('');
      const items = await api.getHistory(lead.id);
      setHistory(items);
    } catch (e: any) {
      alert('Errore nel salvataggio: ' + e.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleSaveAppointment = async () => {
    if (!calendarDateTime) return alert('Seleziona data e ora');
    setSavingCalendar(true);
    setCalendarError('');
    setCalendarSuccess(false);

    try {
      const vendorToAssign = isVenditore ? activeColleague : (calendarType === 'visit' ? calendarVendor : '');
      const typeToAssign = isVenditore ? 'visit' : calendarType;

      await api.createAppointment({
        leadId: lead.id,
        leadName: lead.name,
        colleague: activeColleague,
        assignedVendor: vendorToAssign,
        dateTime: calendarDateTime,
        title: calendarTitle,
        notes: calendarNotes,
        appointmentType: typeToAssign,
      });

      setCalendarSuccess(true);
      setCalendarDateTime('');
      setCalendarNotes('');

      // Ricarica la cronologia del lead per visualizzare subito la nota automatica dell'appuntamento
      try {
        const items = await api.getHistory(lead.id);
        setHistory(items);
      } catch (hErr) {
        console.error('Error reloading history after appointment:', hErr);
      }
    } catch (e: any) {
      setCalendarError('Errore: ' + e.message);
    } finally {
      setSavingCalendar(false);
    }
  };

  const handleDeleteLead = async () => {
    try {
      await api.deleteLead(lead.id);
      if (onDeleteLead) {
        onDeleteLead(lead.id);
      }
      onClose();
    } catch (e: any) {
      alert('Errore durante l\'eliminazione: ' + e.message);
    }
  };

  const handleQuickReassign = async (newColleague: string) => {
    try {
      const updated = await api.updateLead(lead.id, { assignedColleague: newColleague });
      onUpdateLead(updated);
    } catch (e: any) {
      alert('Errore riassegnazione: ' + e.message);
    }
  };

  return (
    <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-full overflow-hidden">
      
      {/* Header Drawer */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lead.type === 'Cliente' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {lead.type || 'Lead'}
            </span>
            {/* Badge telefonisti assegnati */}
            {lead.assignedTelefonisti && lead.assignedTelefonisti.length > 0 && lead.assignedTelefonisti.map(t => (
              <span key={t} className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-lg">📞 {t}</span>
            ))}
            {/* Badge agente assegnato */}
            {lead.assignedColleague && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg">💼 {lead.assignedColleague}</span>
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">{lead.name}</h2>
          {lead.company && (
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {lead.company}
            </p>
          )}

          {/* Recapiti Contatto: Telefono ed Email */}
          <div className="mt-2 space-y-1">
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors group"
                title="Chiama numero"
              >
                <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <Phone className="w-3 h-3" />
                </span>
                <span>{lead.phone}</span>
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                <Phone className="w-3 h-3" /> Nessun telefono
              </span>
            )}

            {lead.email ? (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors group truncate max-w-[240px]"
                title="Scrivi email"
              >
                <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Mail className="w-3 h-3" />
                </span>
                <span className="truncate">{lead.email}</span>
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                <Mail className="w-3 h-3" /> Nessuna email
              </span>
            )}
          </div>

          {lead.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(lead.address)}&t=k`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50/80 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all w-fit cursor-pointer group"
              title="Apri in Google Maps (Vista Satellitare)"
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="truncate max-w-[200px]">{lead.address}</span>
              <ExternalLink className="w-3 h-3 opacity-60 ml-0.5 flex-shrink-0" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isVenditore && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
              title="Elimina Lead"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Action Contacts */}
      <div className={`p-4 border-b border-slate-100 bg-white ${isVenditore ? 'flex' : 'grid grid-cols-2 gap-2'}`}>
        <a 
          href={`tel:${lead.phone}`}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2.5 px-3 rounded-xl text-xs font-bold transition-all"
        >
          <Phone className="w-4 h-4" />
          Chiama
        </a>

        {!isVenditore && sessionRole !== 'telefonista' && (lead.phone ? (
          <div className="relative">
            <button
              onClick={() => setShowSmsDropdown(!showSmsDropdown)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              SMS
            </button>

            {showSmsDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Invia Template SMS</p>
                {smsTemplates.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-2 py-1">Nessun template SMS salvato</p>
                ) : (
                  smsTemplates.map(tpl => (
                    <a
                      key={tpl.id}
                      href={generateSmsLink(tpl.body)}
                      onClick={() => setShowSmsDropdown(false)}
                      className="block px-2.5 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold rounded-lg transition-colors truncate"
                    >
                      {tpl.name}
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <button disabled className="opacity-50 cursor-not-allowed flex items-center justify-center gap-2 bg-slate-50 text-slate-400 py-2.5 px-3 rounded-xl text-xs font-bold">
            <MessageSquare className="w-4 h-4" /> SMS
          </button>
        ))}
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Storico
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'schedule' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Fissa App.
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Task
        </button>
        {!isVenditore && (
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'email' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Email
          </button>
        )}
        <button
          onClick={() => setActiveTab('attachments')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'attachments' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Allegati
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* TAB 1: HISTORY & ACTION */}
        {activeTab === 'history' && (
          <>
            {/* Record Action Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Registra Attività</span>
                <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                  {!isVenditore && (
                    <button 
                      onClick={() => setActionType('call')}
                      className={`px-2.5 py-1 rounded-md transition-all ${actionType === 'call' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                    >
                      Chiamata
                    </button>
                  )}
                  <button 
                    onClick={() => setActionType('note')}
                    className={`px-2.5 py-1 rounded-md transition-all ${actionType === 'note' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                  >
                    Nota
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Nuovo Stato Contatto</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Lead['status'])}
                  className="w-full bg-white border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Nuovo">⚪ Nuovo</option>
                  <option value="Chiamato - Nessuna Risposta">🟡 Nessuna Risposta</option>
                  <option value="Da richiamare">🔵 Da richiamare</option>
                  <option value="Interessato">🟢 Interessato</option>
                  <option value="Non interessato">🔴 Non interessato</option>
                  <option value="Chiuso con successo">🏆 Chiuso con successo</option>
                </select>
              </div>

              <div>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Esito o dettagli..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 text-xs rounded-xl p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                onClick={handleSaveAction}
                disabled={savingAction}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                {savingAction ? 'Salvataggio...' : 'Registra Attività'}
              </button>
            </div>

            {/* History Feed */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cronologia ({history.length})</span>
              {loadingHistory ? (
                <div className="text-center py-6 text-xs text-slate-400">Caricamento...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50 rounded-2xl">
                  Nessuna attività ancora registrata.
                </div>
              ) : (
                history.map((item) => {
                  const isEmail = item.type === 'email';
                  const isReply = isEmail && item.note.includes('[RISPOSTA');
                  const isOpen = isEmail && item.note.includes('[EMAIL APERTA]');
                  const isClick = isEmail && item.note.includes('[LINK CLICCATO]');
                  
                  let cardBg = 'bg-slate-50 border-slate-100';
                  let badgeBg = 'bg-slate-200 text-slate-700';

                  if (isReply) {
                    cardBg = 'bg-emerald-50/70 border-emerald-200';
                    badgeBg = 'bg-emerald-600 text-white font-extrabold';
                  } else if (isOpen) {
                    cardBg = 'bg-blue-50/70 border-blue-200';
                    badgeBg = 'bg-blue-600 text-white font-extrabold';
                  } else if (isClick) {
                    cardBg = 'bg-violet-50/70 border-violet-200';
                    badgeBg = 'bg-violet-600 text-white font-extrabold';
                  } else if (isEmail) {
                    cardBg = 'bg-indigo-50/50 border-indigo-100';
                    badgeBg = 'bg-indigo-100 text-indigo-700 font-bold';
                  }

                  return (
                    <div key={item.id} className={`border rounded-xl p-3 space-y-1 transition-all ${cardBg}`}>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                        <span>{item.colleague || 'Sistema'} • {new Date(item.timestamp).toLocaleString('it-IT')}</span>
                        <span className={`uppercase text-[9px] px-1.5 py-0.5 rounded ${badgeBg}`}>
                          {isReply ? '💬 RISPOSTA' : isOpen ? '👁️ APERTA' : isClick ? '🖱️ CLICK' : item.type}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                          {item.note.replace(/\s*\[MSGID:[^\]]+\]/g, '')}
                        </p>
                      )}
                      {item.statusAfterCall && item.statusAfterCall !== lead.status && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/80 text-slate-600 border border-slate-200">
                          → {item.statusAfterCall}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* TAB 2: SCHEDULE APPOINTMENT */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {isVenditore ? 'Fissa Sopralluogo per Me Stesso' : 'Fissa Appuntamento / Sopralluogo'}
            </span>

            {!isVenditore && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Tipo di Appuntamento *</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarType('visit');
                      setCalendarTitle(`Sopralluogo: ${lead.name}`);
                    }}
                    className={`py-2 px-3 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      calendarType === 'visit'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🏠 Sopralluogo Agente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarType('call');
                      setCalendarTitle(`Richiamo telefonico: ${lead.name}`);
                    }}
                    className={`py-2 px-3 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      calendarType === 'call'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>📞 Richiamo Ufficio</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Titolo Evento</label>
              <input
                type="text"
                value={calendarTitle}
                onChange={e => setCalendarTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800 font-medium"
              />
            </div>

            {isVenditore ? (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                <span>💼 Assegnato automaticamente a te: <strong>{activeColleague}</strong></span>
              </div>
            ) : (
              calendarType === 'visit' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Agente Commerciale Assegnato *</label>
                  <select
                    value={calendarVendor}
                    onChange={e => setCalendarVendor(e.target.value)}
                    className="w-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold rounded-xl p-2.5 cursor-pointer"
                  >
                    {allColleagueObjs.filter(c => c.role === 'venditore').map(v => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                    {allColleagueObjs.filter(c => c.role === 'venditore').length === 0 && (
                      colleagues.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))
                    )}
                  </select>
                </div>
              )
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Data e Ora Sopralluogo *</label>
              <input
                type="datetime-local"
                value={calendarDateTime}
                onChange={e => setCalendarDateTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl p-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Note Aggiuntive</label>
              <textarea
                value={calendarNotes}
                onChange={e => setCalendarNotes(e.target.value)}
                rows={2}
                placeholder="Dettagli appuntamento..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800"
              />
            </div>

            {calendarError && (
              <p className="text-xs text-rose-500 font-semibold">{calendarError}</p>
            )}

            {calendarSuccess && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Appuntamento salvato con successo!
              </p>
            )}

            <button
              onClick={handleSaveAppointment}
              disabled={savingCalendar}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              {savingCalendar ? 'Salvataggio...' : 'Conferma Appuntamento'}
            </button>
          </div>
        )}

        {/* TAB 3: TASKS */}
        {activeTab === 'tasks' && (
          <TaskForm 
            lead={lead} 
            colleagues={colleagues} 
            activeColleague={activeColleague}
            googleToken={googleToken}
          />
        )}

        {/* TAB 4: SEND EMAIL */}
        {!isVenditore && activeTab === 'email' && (
          <SendEmailForm 
            lead={lead}
            onClose={() => setActiveTab('history')}
          />
        )}

        {/* TAB 5: ATTACHMENTS */}
        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Documenti & Allegati Lead</span>

            {/* Upload Form Box */}
            <form onSubmit={handleUploadAttachment} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-indigo-600" />
                Carica Nuovo Allegato
              </span>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Descrizione File * (es. Bolletta 2° trim., Visura Camerale)</label>
                <input
                  type="text"
                  required
                  placeholder="Scrivi cosa contiene questo file..."
                  value={attachmentDescription}
                  onChange={e => setAttachmentDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Seleziona File * (PDF, Scansione, Immagine fino a 50MB)</label>
                <input
                  id="lead-attachment-input"
                  type="file"
                  required
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full bg-white border border-slate-200 text-xs rounded-xl p-2 text-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-slate-400">
                  Caricato da: <strong className="text-indigo-600">{activeColleague || 'Ufficio'}</strong>
                </span>
                <button
                  type="submit"
                  disabled={uploadingAttachment}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  {uploadingAttachment ? 'Caricamento...' : 'Carica Allegato'}
                </button>
              </div>
            </form>

            {/* List of Attachments */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Allegati Salvati ({attachments.length})
              </span>

              {loadingAttachments ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Caricamento documenti...</p>
              ) : attachments.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-2xl">
                  <File className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-400 italic">Nessun documento caricato per questo lead.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {attachments.map(att => (
                    <div key={att.id} className="bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-3.5 space-y-2 shadow-xs transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">{att.description}</h4>
                            <p className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">{att.fileName}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Elimina Documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                        <span>
                          Caricato da: <strong className="text-slate-700">{att.uploadedBy}</strong> • {new Date(att.createdAt).toLocaleDateString('it-IT')}
                        </span>
                        <a
                          href={`/api/attachments/${att.id}/download?token=${encodeURIComponent(auth.getToken() || '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3 h-3" /> Apri / Scarica
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="bg-rose-100 text-rose-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Eliminare questo lead?</h3>
            <p className="text-xs text-slate-500">L'azione è irreversibile e rimuoverà anche la cronologia attività e appuntamenti associati.</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button 
                onClick={handleDeleteLead}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closed with success confirmation modal */}
      {showClosedConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🏆
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">Conferma Chiusura Contratto</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Impostando lo stato su <strong>Chiuso con successo</strong>, verrà inviata un'email automatica al cliente <strong>{lead.name}</strong> con una richiesta di recensione e un voto in stelline per l'agente <strong>{lead.assignedColleague || activeColleague}</strong>.
              </p>
              <p className="text-[11px] text-emerald-800 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                ⭐ Il voto del cliente influirà direttamente sulla media stelline dell'agente!
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowClosedConfirmModal(false);
                  setNewStatus(lead.status);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 text-xs rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={executeSaveAction}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 text-xs rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Conferma & Invia Recensione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
