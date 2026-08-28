import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Lead, SmtpAccount, EmailTemplate } from '../types';
import { Mail, Send, Check, AlertCircle, Paperclip } from 'lucide-react';

interface SendEmailFormProps {
  lead: Lead;
  onClose: () => void;
}

export default function SendEmailForm({ lead, onClose }: SendEmailFormProps) {
  const [smtpAccounts, setSmtpAccounts] = useState<SmtpAccount[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [toEmail, setToEmail] = useState(lead.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

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
      setTemplates(tpls);
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
    }
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
        to: toEmail,
        subject,
        body,
      });

      await api.addHistory(lead.id, {
        colleague: 'Sistema Email',
        note: `[Email Inviata] Oggetto: ${subject}`,
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
