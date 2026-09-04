import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Lead, SmtpAccount, EmailTemplate, EmailAttachment, LeadAttachment } from '../types';
import { Mail, Send, Check, AlertCircle, Paperclip, File, Trash2, UploadCloud, FolderOpen } from 'lucide-react';

interface SendEmailFormProps {
  lead: Lead;
  onClose: () => void;
}

export default function SendEmailForm({ lead, onClose }: SendEmailFormProps) {
  const [smtpAccounts, setSmtpAccounts] = useState<SmtpAccount[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [leadAttachments, setLeadAttachments] = useState<LeadAttachment[]>([]);
  const [showLeadFilesModal, setShowLeadFilesModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [toEmail, setToEmail] = useState(lead.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    api.getLeadAttachments(lead.id).then(setLeadAttachments).catch(console.error);
  }, [lead.id]);

  const fetchData = async () => {
    try {
      const [accs, tpls] = await Promise.all([
        api.getSmtpAccounts(),
        api.getEmailTemplates()
      ]);
      const mappedAccs = accs.map((a: any) => ({
        id: a.id,
        name: a.name,
        host: a.host,
        port: a.port,
        user: a.user_email || a.user || '',
        pass: a.pass
      }));
      setSmtpAccounts(mappedAccs);
      if (mappedAccs.length > 0) setSelectedAccount(mappedAccs[0].id);

      // Escludi i template automatici di sistema (Ringraziamento Post-Sopralluogo e Richiesta Recensione)
      // che devono partire solo in automatico e rimanere one-time
      const manualTemplates = (tpls || []).filter((t: any) => {
        if (t.templateType === 'post_visit' || t.templateType === 'review_request') return false;
        const normalizedName = (t.name || '').toLowerCase().trim();
        if (normalizedName.includes('post-sopralluogo') || normalizedName.includes('recensione consulente') || normalizedName.includes('richiesta recensione')) {
          return false;
        }
        return true;
      });
      setTemplates(manualTemplates);
    } catch (e) {
      console.error('Error fetching email form data:', e);
    }
  };

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplate(tplId);
    const found = templates.find(t => t.id === tplId);
    if (found) {
      let sub = found.subject
        .replace(/{nome}/g, lead.name)
        .replace(/{azienda}/g, lead.company || '')
        .replace(/{servizio}/g, lead.service || '');

      let b = found.body
        .replace(/{nome}/g, lead.name)
        .replace(/{azienda}/g, lead.company || '')
        .replace(/{servizio}/g, lead.service || '');

      setSubject(sub);
      setBody(b);

      // Se il template ha allegati fissi, caricali automaticamente nell'email
      let tplAtts: EmailAttachment[] = [];
      if (found.attachments) {
        if (typeof found.attachments === 'string') {
          try { tplAtts = JSON.parse(found.attachments); } catch(e){}
        } else if (Array.isArray(found.attachments)) {
          tplAtts = found.attachments;
        }
      }
      setEmailAttachments(tplAtts);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error || new Error('Errore lettura file'));
      reader.readAsDataURL(file);
    });
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const newAtts: EmailAttachment[] = [...emailAttachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 15 * 1024 * 1024) {
          alert(`Il file "${file.name}" supera il limite consigliato di 15MB.`);
          continue;
        }
        const dataUrl = await readFileAsBase64(file);
        newAtts.push({
          filename: file.name,
          content: dataUrl,
          contentType: file.type,
          size: file.size
        });
      }
      setEmailAttachments(newAtts);
    } catch (err: any) {
      alert('Errore caricamento allegati: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleAddFromLeadDoc = async (doc: LeadAttachment) => {
    try {
      // Scarica il file dal server e convertilo in base64 per l'invio
      const res = await fetch(`/api/attachments/${doc.id}/download`);
      if (!res.ok) throw new Error('Impossibile scaricare il file dal server');
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setEmailAttachments(prev => [
          ...prev,
          {
            filename: doc.fileName,
            content: dataUrl,
            contentType: doc.mimeType,
            size: doc.fileSize
          }
        ]);
        setShowLeadFilesModal(false);
      };
      reader.readAsDataURL(blob);
    } catch (e: any) {
      alert('Errore nel recupero documento del lead: ' + e.message);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!toEmail || !subject || !body || !selectedAccount) {
      return setError('Compilare tutti i campi obbligatori e selezionare un account SMTP.');
    }

    const acc = smtpAccounts.find(a => a.id === selectedAccount);
    if (!acc) return setError('Account SMTP non trovato');

    setSending(true);
    setError('');
    setSuccess(false);

    try {
      await api.sendEmail({
        smtpHost: acc.host,
        smtpPort: acc.port,
        smtpUser: acc.user,
        smtpPass: acc.pass,
        fromName: acc.name || 'Solar Brand',
        to: toEmail,
        subject,
        body,
        attachments: emailAttachments.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType
        }))
      });

      const attListStr = emailAttachments.length > 0 
        ? ` (${emailAttachments.length} allegat${emailAttachments.length === 1 ? 'o' : 'i'}: ${emailAttachments.map(a => a.filename).join(', ')})`
        : '';

      await api.addHistory(lead.id, {
        colleague: 'Sistema Email',
        note: `[Email Inviata] Oggetto: ${subject}${attListStr}`,
        statusAfterCall: lead.status,
        type: 'email',
      });

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (e: any) {
      setError(e.message || 'Errore durante l\'invio dell\'email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Invia Email al Lead</span>
      </div>

      {Boolean(lead.unsubscribed) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            🚫 ATTENZIONE: Contatto Disiscritto
          </p>
          <p className="text-[11px] text-rose-700">
            Questo contatto ha revocato il consenso e si è disiscritto dalle comunicazioni promozionali. Procedi con l'invio solo se strettamente richiesto dal cliente via telefono.
          </p>
        </div>
      )}

      {smtpAccounts.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
          <p className="font-bold">⚠️ Account Email non ancora attivo</p>
          <p className="text-[11px] text-amber-700">Chiedi all'amministrazione dell'ufficio di aggiungere l'account SMTP di posta aziendale per abilitare l'invio diretto.</p>
        </div>
      ) : (
        <>
          {smtpAccounts.length > 1 && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Account Mittente</label>
              <select
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl p-2.5 text-slate-800"
              >
                {smtpAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.user})</option>
                ))}
              </select>
            </div>
          )}

          {templates.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Template Messaggio Predefinito</label>
              <select
                value={selectedTemplate}
                onChange={e => handleTemplateSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl p-2.5 text-slate-800 cursor-pointer"
              >
                <option value="">-- Seleziona un modello --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Destinatario</label>
            <input
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800 font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Oggetto Email *</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="es. Proposta Impianto Fotovoltaico SolarBrand"
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800 font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Testo Email *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Scrivi il messaggio..."
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800 font-sans"
            />
          </div>

          {/* Sezione Allegati Email */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                Allegati Email ({emailAttachments.length})
              </label>

              <div className="flex items-center gap-1.5">
                {leadAttachments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowLeadFilesModal(true)}
                    className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Seleziona dai documenti già caricati per questo lead"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Da Documenti Lead ({leadAttachments.length})</span>
                  </button>
                )}

                <label className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Allega File</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUploadFiles}
                  />
                </label>
              </div>
            </div>

            {emailAttachments.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                Nessun file allegato. Puoi caricare nuovi file o pescare dai documenti già presenti nella scheda del lead.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {emailAttachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs shadow-2xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <File className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{att.filename}</span>
                      {att.size && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(att.size / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                      title="Rimuovi allegato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Selezione File Documenti Lead */}
          {showLeadFilesModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    Scegli dai Documenti del Lead
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLeadFilesModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                  >
                    Chiudi
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {leadAttachments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 transition-colors"
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{doc.description || doc.fileName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{doc.fileName} • {(doc.fileSize / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddFromLeadDoc(doc)}
                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                      >
                        Allega
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
          {success && <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5"/> Email inviata con successo!</p>}

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Invio in corso...' : 'Invia Email Ora'}
          </button>
        </>
      )}
    </div>
  );
}
