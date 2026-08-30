import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Save, Server, AlertCircle, Plus, Trash2, Key, Building2 } from 'lucide-react';
import { SmtpAccount } from '../types';

interface SmtpSettingsManagerProps {
  onClose: () => void;
}

export default function SmtpSettingsManager({ onClose }: SmtpSettingsManagerProps) {
  const [accounts, setAccounts] = useState<SmtpAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apifyToken, setApifyToken] = useState('');
  const [apifyTokenSaved, setApifyTokenSaved] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [publicUrlSaved, setPublicUrlSaved] = useState(false);
  const [companySmtpId, setCompanySmtpId] = useState('');
  const [savingCompanyEmail, setSavingCompanyEmail] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    host: 'smtp.gmail.com',
    port: '587',
    user: '',
    pass: ''
  });

  useEffect(() => {
    fetchAccounts();
    api.getSettings().then(s => {
      setApifyToken(s['apify_token'] || s['apify_api_key'] || '');
      setApifyTokenSaved(Boolean(s['apify_token'] || s['apify_api_key']));
      setPublicUrl(s['public_url'] || 'https://crm.solarbrandkg.it');
      setPublicUrlSaved(Boolean(s['public_url']));
      setCompanySmtpId(s['company_smtp_id'] || '');
    }).catch(console.error);
  }, []);

  const handleSaveCompanyEmail = async () => {
    setSavingCompanyEmail(true);
    try {
      await api.setSetting('company_smtp_id', companySmtpId);
      alert('✅ Email Aziendale impostata! Verrà usata per le due email automatiche di sistema.');
    } catch (e: any) {
      alert('Errore salvataggio: ' + e.message);
    } finally {
      setSavingCompanyEmail(false);
    }
  };

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSmtpAccounts();
      setAccounts(data.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        host: acc.host,
        port: acc.port,
        user: acc.user_email || acc.user || '',
        pass: acc.pass
      })));
    } catch (error) {
      console.error("Error fetching SMTP accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApifyToken = async () => {
    try {
      const token = apifyToken.trim();
      await api.setSetting('apify_token', token);
      await api.setSetting('apify_api_key', token);
      setApifyTokenSaved(Boolean(token));
      alert('✅ Token API Apify salvato con successo!');
    } catch (e: any) {
      alert('Errore salvataggio token Apify: ' + e.message);
    }
  };

  const handleSavePublicUrl = async () => {
    try {
      const url = publicUrl.trim().replace(/\/$/, ''); // remove trailing slash
      await api.setSetting('public_url', url);
      setPublicUrl(url);
      setPublicUrlSaved(true);
      alert('✅ URL Pubblico salvato! Il tracking email ora funzionerà correttamente.');
    } catch (e: any) {
      alert('Errore: ' + e.message);
    }
  };

  const handleEdit = (acc: SmtpAccount) => {
    setEditingId(acc.id);
    setFormData({
      name: acc.name || '',
      host: acc.host || '',
      port: acc.port || '',
      user: acc.user || '',
      pass: acc.pass || ''
    });
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      host: 'smtp.gmail.com',
      port: '587',
      user: '',
      pass: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.host || !formData.user || !formData.pass) {
      return alert('Compilare tutti i campi obbligatori');
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        host: formData.host,
        port: formData.port,
        user_email: formData.user,
        pass: formData.pass
      };

      if (editingId) {
        await api.updateSmtpAccount(editingId, payload);
      } else {
        await api.createSmtpAccount(payload);
      }
      handleCreateNew();
      fetchAccounts();
    } catch (err: any) {
      alert('Errore salvataggio account SMTP: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo account SMTP?')) return;
    try {
      await api.deleteSmtpAccount(id);
      if (editingId === id) handleCreateNew();
      if (companySmtpId === id) {
        setCompanySmtpId('');
        await api.setSetting('company_smtp_id', '');
      }
      fetchAccounts();
    } catch (err: any) {
      alert('Errore eliminazione account SMTP: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Impostazioni Server & Integrazioni</h2>
              <p className="text-sm text-slate-500">Configurazione SMTP per invio Email e API Keys</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Apify API Token Section */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Token API Apify (Google Maps Lead Generator)</h3>
              </div>
              {apifyTokenSaved && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  ✅ Configurato
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Inserisci il tuo Token API personale di Apify per estrarre lead territoriali con Google Maps Scraper (con email e telefono).
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apifyToken}
                onChange={e => setApifyToken(e.target.value)}
                placeholder="apify_api_..."
                className="flex-1 bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={handleSaveApifyToken}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Salva Token
              </button>
            </div>
          </div>

          {/* === PUBLIC URL FOR TRACKING === */}
          <div className={`border rounded-2xl p-5 space-y-3 ${publicUrlSaved ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{publicUrlSaved ? '✅' : '⚠️'}</span>
                <h3 className="font-bold text-slate-800 text-base">URL Pubblico del Server (per Tracking Email)</h3>
              </div>
              {publicUrlSaved && <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">CONFIGURATO</span>}
            </div>
            <p className="text-xs text-slate-700">
              Indirizzo pubblico del gestionale utilizzato per registrare le aperture e i click dei clienti sulle email inviate.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={publicUrl}
                onChange={e => { setPublicUrl(e.target.value); setPublicUrlSaved(false); }}
                placeholder="https://tuodominio.com  oppure  https://abc.ngrok.io"
                className="flex-1 bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
              />
              <button
                onClick={handleSavePublicUrl}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                Salva URL
              </button>
            </div>
          </div>

          {/* Email Aziendale — usata per le 2 email automatiche di sistema */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-base">Email Aziendale</h3>
            </div>
            <p className="text-xs text-slate-600">
              Questo account verrà usato per le <strong>due email automatiche di sistema</strong>: il ringraziamento inviato dopo ogni sopralluogo e la richiesta di recensione quando un lead viene chiuso con successo.
              Resta comunque disponibile, come tutti gli altri, per le campagne email massive e ogni altro invio manuale.
            </p>
            {accounts.length === 0 ? (
              <p className="text-xs text-amber-700 font-semibold">Aggiungi prima almeno un account SMTP qui sotto, poi torna qui per designarlo come Email Aziendale.</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <select
                    value={companySmtpId}
                    onChange={e => setCompanySmtpId(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-sm font-bold rounded-xl px-3 py-2.5 cursor-pointer"
                  >
                    <option value="">— Nessuna scelta esplicita (usa il primo account creato) —</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.user})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveCompanyEmail}
                    disabled={savingCompanyEmail}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
                  >
                    {savingCompanyEmail ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
                {!companySmtpId && (
                  <p className="text-[11px] text-slate-500 italic">
                    Nessuna email aziendale designata esplicitamente: il sistema userà automaticamente "{accounts[0]?.name}" (il primo account creato) finché non ne scegli una qui.
                  </p>
                )}
              </>
            )}
          </div>

          {/* SMTP Accounts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Account List */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Account SMTP Salvati ({accounts.length})</h3>
                <button
                  onClick={handleCreateNew}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuovo Account
                </button>
              </div>

              {isLoading ? (
                <p className="text-sm text-slate-400">Caricamento account...</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Nessun account SMTP configurato.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {accounts.map(acc => (
                    <div key={acc.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm">{acc.name}</h4>
                          {acc.id === companySmtpId && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Email Aziendale
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{acc.user} ({acc.host}:{acc.port})</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(acc)}
                          className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SMTP Form */}
            <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-slate-700">
                {editingId ? 'Modifica Account SMTP' : 'Aggiungi Account SMTP'}
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome Account *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="es. Email Commerciale Gmail"
                  className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Host SMTP *</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={e => setFormData({ ...formData, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Porta *</label>
                  <input
                    type="text"
                    value={formData.port}
                    onChange={e => setFormData({ ...formData, port: e.target.value })}
                    placeholder="587"
                    className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Utente / Email SMTP *</label>
                <input
                  type="email"
                  value={formData.user}
                  onChange={e => setFormData({ ...formData, user: e.target.value })}
                  placeholder="tuamail@gmail.com"
                  className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Password App *</label>
                <input
                  type="password"
                  value={formData.pass}
                  onChange={e => setFormData({ ...formData, pass: e.target.value })}
                  placeholder="Password di app o pass SMTP"
                  className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvataggio...' : 'Salva Account SMTP'}
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
}
