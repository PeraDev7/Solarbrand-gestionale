import React, { useState, useEffect } from 'react';
import { X, Save, Mail, Plus, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ImapAccount } from '../types';
import { authFetch as fetch } from '../lib/api';

interface ImapSettingsManagerProps {
  onClose: () => void;
}

export default function ImapSettingsManager({ onClose }: ImapSettingsManagerProps) {
  const [accounts, setAccounts] = useState<ImapAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{ id: string; msg: string } | null>(null);
  const [showPass, setShowPass] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    host: 'imap.gmail.com',
    port: '993',
    user_email: '',
    pass: '',
    useSSL: true,
  });

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/imap-accounts');
      const data = await res.json();
      setAccounts(data.map((a: any) => ({ ...a, useSSL: Boolean(a.useSSL) })));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setFormData({ name: '', host: 'imap.gmail.com', port: '993', user_email: '', pass: '', useSSL: true });
  };

  const handleEdit = (acc: ImapAccount) => {
    setEditingId(acc.id);
    setFormData({ name: acc.name, host: acc.host, port: acc.port, user_email: acc.user_email, pass: acc.pass, useSSL: Boolean(acc.useSSL) });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.host.trim() || !formData.user_email.trim()) {
      return alert('Nome, host e email sono obbligatori');
    }
    setIsSaving(true);
    try {
      const url = editingId ? `/api/imap-accounts/${editingId}` : '/api/imap-accounts';
      const method = editingId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      handleCreateNew();
      fetchAccounts();
    } catch (e: any) {
      alert('Errore: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo account IMAP?')) return;
    await fetch(`/api/imap-accounts/${id}`, { method: 'DELETE' });
    if (editingId === id) handleCreateNew();
    fetchAccounts();
  };

  const handleCheck = async (id: string) => {
    setCheckingId(id);
    setCheckResult(null);
    try {
      const res = await fetch(`/api/imap-accounts/${id}/check`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const parts = [];
        if (data.repliesFound > 0) parts.push(`${data.repliesFound} risposte a campagne`);
        if (data.inboxMatches > 0) parts.push(`${data.inboxMatches} email in arrivo abbinate a lead`);
        const summary = parts.length > 0 ? parts.join(', ') : 'nessuna novità';
        setCheckResult({ id, msg: `✅ Controllo completato: ${summary}.` });
        fetchAccounts();
      } else {
        setCheckResult({ id, msg: `Errore: ${data.error}` });
      }
    } catch (e: any) {
      setCheckResult({ id, msg: `Errore di connessione: ${e.message}` });
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 text-teal-600 p-2 rounded-xl"><Mail className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Account IMAP — Lettura Risposte</h2>
              <p className="text-sm text-slate-500">Configura gli account per rilevare le risposte dei lead alle campagne</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"><X className="w-6 h-6" /></button>
        </div>

        <div className="mx-6 mt-4 bg-teal-50 border border-teal-200 rounded-2xl p-4 shrink-0">
          <p className="text-xs font-bold text-teal-800 mb-1">ℹ️ Come funziona</p>
          <p className="text-xs text-teal-700">Il sistema controlla automaticamente la posta ogni 10 minuti. Quando un lead risponde, la risposta viene registrata nella sua scheda. Per Gmail usa una <strong>App Password</strong>. Porta consigliata: <strong>993 SSL</strong>.</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-700">Account ({accounts.length})</h3>
              <button onClick={handleCreateNew} className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Nuovo
              </button>
            </div>
            {isLoading ? <p className="text-sm text-slate-400">Caricamento...</p> : accounts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Nessun account IMAP configurato.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {accounts.map(acc => (
                  <div key={acc.id} className="border border-slate-200 bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{acc.name}</h4>
                        <p className="text-xs text-slate-500 font-mono">{acc.user_email}</p>
                        <p className="text-xs text-slate-400">{acc.host}:{acc.port} {acc.useSSL ? '(SSL)' : ''}</p>
                        {acc.lastChecked && <p className="text-[11px] text-teal-600 mt-0.5">Ultimo check: {new Date(acc.lastChecked).toLocaleString('it-IT')}</p>}
                      </div>
                      <div className={`w-2 h-2 rounded-full mt-1 ${acc.lastChecked ? 'bg-teal-400' : 'bg-slate-300'}`} />
                    </div>
                    {checkResult?.id === acc.id && (
                      <p className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700">{checkResult.msg}</p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => handleCheck(acc.id)} disabled={checkingId === acc.id}
                        className="text-xs font-bold text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${checkingId === acc.id ? 'animate-spin' : ''}`} />
                        {checkingId === acc.id ? 'Controllo...' : 'Controlla ora'}
                      </button>
                      <button onClick={() => handleEdit(acc)} className="text-xs font-bold text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg cursor-pointer">Modifica</button>
                      <button onClick={() => handleDelete(acc.id)} className="text-xs font-bold text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg flex items-center gap-1 cursor-pointer ml-auto">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-slate-700">{editingId ? 'Modifica Account' : 'Nuovo Account IMAP'}</h3>

            {[
              { label: 'Nome Identificativo *', key: 'name', type: 'text', placeholder: 'es. Gmail Ufficio' },
              { label: 'Email *', key: 'user_email', type: 'email', placeholder: 'tuoemail@gmail.com' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
                <input type={type} value={(formData as any)[key]} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Host IMAP *</label>
                <input type="text" value={formData.host} onChange={e => setFormData(p => ({ ...p, host: e.target.value }))}
                  placeholder="imap.gmail.com" className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Porta</label>
                <input type="text" value={formData.port} onChange={e => setFormData(p => ({ ...p, port: e.target.value }))}
                  className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Password / App Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={formData.pass} onChange={e => setFormData(p => ({ ...p, pass: e.target.value }))}
                  placeholder="••••••••••••••••" className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.useSSL} onChange={e => setFormData(p => ({ ...p, useSSL: e.target.checked }))} className="w-4 h-4 accent-teal-600" />
              <span className="text-sm font-semibold text-slate-700">Usa SSL/TLS (consigliato)</span>
            </label>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-bold mb-1">💡 Gmail: usa App Password</p>
              <p>Vai su <strong>account.google.com → Sicurezza → Password per le app</strong> e genera una password specifica per questa app.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingId && <button onClick={handleCreateNew} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl cursor-pointer">Annulla</button>}
              <button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer">
                <Save className="w-4 h-4" />{isSaving ? 'Salvataggio...' : 'Salva Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
