import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Send, Trash2, Users, Mail, BarChart2, ChevronRight,
  Flame, Eye, MousePointer, MessageCircle, CheckCircle, XCircle,
  Clock, RefreshCw, Filter, AlertCircle, ArrowUpDown
} from 'lucide-react';
import { EmailCampaign, EmailCampaignRecipient, EmailTemplate, Lead } from '../types';
import { authFetch as fetch } from '../lib/api';

interface SmtpAccount { id: string; name: string; user_email: string; }

interface EmailCampaignManagerProps {
  onClose: () => void;
  currentUser: string;
  onOpenLead?: (leadId: string) => void;
}

type View = 'list' | 'create' | 'detail';

function temperatureLabel(temp: number) {
  if (temp >= 60) return { label: '🔥🔥🔥 Bollente', color: 'text-red-600 bg-red-50 border-red-200' };
  if (temp >= 40) return { label: '🔥🔥 Molto caldo', color: 'text-orange-600 bg-orange-50 border-orange-200' };
  if (temp >= 20) return { label: '🔥 Caldo', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  if (temp >= 10) return { label: '👁️ Aperto', color: 'text-blue-600 bg-blue-50 border-blue-200' };
  return { label: '❄️ Freddo', color: 'text-slate-500 bg-slate-50 border-slate-200' };
}

function pct(num: number, total: number): string {
  if (!total) return '0%';
  return Math.round((num / total) * 100) + '%';
}

export default function EmailCampaignManager({ onClose, currentUser, onOpenLead }: EmailCampaignManagerProps) {
  const [view, setView] = useState<View>('list');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [recipients, setRecipients] = useState<EmailCampaignRecipient[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [smtpAccounts, setSmtpAccounts] = useState<SmtpAccount[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sortByTemp, setSortByTemp] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('Tutti');

  // Create form state
  const [form, setForm] = useState({
    name: '',
    templateId: '',
    smtpId: '',
    sendDelay: 3,
  });
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, tRes, sRes, lRes] = await Promise.all([
        fetch('/api/email-campaigns').then(r => r.json()),
        fetch('/api/email-templates').then(r => r.json()),
        fetch('/api/smtp-accounts').then(r => r.json()),
        fetch('/api/leads').then(r => r.json()),
      ]);
      setCampaigns(cRes);
      setTemplates(tRes);
      setSmtpAccounts(sRes);
      setLeads(lRes.filter((l: Lead) => l.email));
    } catch (e: any) {
      console.error('Error fetching campaign data:', e);
      alert('Errore durante il caricamento delle campagne: ' + (e?.message || 'errore sconosciuto'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchRecipients = useCallback(async (campaignId: string) => {
    try {
      const data = await fetch(`/api/email-campaigns/${campaignId}/recipients`).then(r => r.json());
      setRecipients(data);
    } catch (e: any) {
      console.error('Error fetching recipients:', e);
      alert('Errore durante il caricamento dei destinatari: ' + (e?.message || 'errore sconosciuto'));
    }
  }, []);

  const refreshDetail = async (campaignId: string) => {
    try {
      const [cList, rList] = await Promise.all([
        fetch('/api/email-campaigns').then(r => r.json()),
        fetch(`/api/email-campaigns/${campaignId}/recipients`).then(r => r.json()),
      ]);
      setCampaigns(cList);
      setRecipients(rList);
      const updatedCamp = cList.find((c: EmailCampaign) => c.id === campaignId);
      if (updatedCamp) setSelectedCampaign(updatedCamp);
    } catch (e: any) {
      console.error('Error refreshing campaign:', e);
    }
  };

  const handleCheckImap = async () => {
    try {
      const accounts = await fetch('/api/imap-accounts').then(r => r.json());
      if (accounts.length === 0) {
        return alert('⚠️ Nessun account IMAP configurato!\n\nVai nel pannello IMAP (pulsante "IMAP" nella toolbar principale) e aggiungi un account con le tue credenziali IMAP per leggere le risposte dei lead.');
      }
      let totalFound = 0;
      for (const acc of accounts) {
        const res = await fetch(`/api/imap-accounts/${acc.id}/check`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) totalFound += (data.foundReplies || 0);
      }
      alert(`✅ Controllo IMAP completato!\nTrovate ${totalFound} nuove risposte.`);
      if (selectedCampaign) {
        await refreshDetail(selectedCampaign.id);
      }
    } catch (e: any) {
      alert('Errore controllo IMAP: ' + e.message);
    }
  };

  const handleTestOpen = async (recipientId: string) => {
    try {
      await fetch(`/api/email-track/open?eid=${recipientId}`);
      if (selectedCampaign) {
        await refreshDetail(selectedCampaign.id);
      }
    } catch (e: any) {
      console.error('Error simulating open:', e);
    }
  };

  const openDetail = async (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    await fetchRecipients(campaign.id);
    setView('detail');
  };

  const handleCreateCampaign = async () => {
    if (!form.name.trim() || !form.templateId || !form.smtpId) {
      return alert('Nome, template e account SMTP sono obbligatori');
    }
    if (selectedLeadIds.length === 0) {
      return alert('Seleziona almeno un lead destinatario');
    }
    setCreatingCampaign(true);
    try {
      const res = await fetch('/api/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, createdBy: currentUser }),
      });
      const campaign = await res.json();

      await fetch(`/api/email-campaigns/${campaign.id}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedLeadIds }),
      });

      await fetchAll();
      setForm({ name: '', templateId: '', smtpId: '', sendDelay: 3 });
      setSelectedLeadIds([]);
      setView('list');
      alert(`Campagna "${campaign.name}" creata con successo con ${selectedLeadIds.length} destinatari. Aprila per avviare l'invio.`);
    } catch (e: any) {
      alert('Errore: ' + e.message);
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleSend = async (campaign: EmailCampaign) => {
    if (!confirm(`Avviare l'invio della campagna "${campaign.name}"? L'operazione non è interrompibile immediatamente.`)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/email-campaigns/${campaign.id}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Invio avviato! ${data.total} email in coda. Puoi chiudere questa finestra, l'invio continua in background.`);
      await fetchAll();
      if (selectedCampaign?.id === campaign.id) {
        const updated = await fetch('/api/email-campaigns').then(r => r.json());
        const found = updated.find((c: EmailCampaign) => c.id === campaign.id);
        if (found) setSelectedCampaign(found);
        await fetchRecipients(campaign.id);
      }
    } catch (e: any) {
      alert('Errore: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Eliminare questa campagna e tutti i suoi dati?')) return;
    await fetch(`/api/email-campaigns/${id}`, { method: 'DELETE' });
    if (selectedCampaign?.id === id) { setView('list'); setSelectedCampaign(null); }
    fetchAll();
  };

  const toggleLead = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredLeads = leads.filter(l => {
    const q = leadSearch.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || (l.company || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q);
  });

  const sortedRecipients = [...recipients].sort((a, b) => {
    if (sortByTemp) return (b.temperature || 0) - (a.temperature || 0);
    return 0;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-600',
      sending: 'bg-blue-100 text-blue-700 animate-pulse',
      sent: 'bg-emerald-100 text-emerald-700',
      paused: 'bg-amber-100 text-amber-700',
    };
    const labels: Record<string, string> = { draft: 'Bozza', sending: '⏳ In invio...', sent: '✅ Inviata', paused: '⏸ In pausa' };
    return <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 text-white p-2 rounded-xl"><Send className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">Campagne Email Massive</h2>
              <p className="text-sm text-white/70">Invia, traccia aperture, click e risposte dei lead</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button onClick={() => { setView('list'); setSelectedCampaign(null); }}
                className="text-white/80 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-1 cursor-pointer">
                ← Torna alla lista
              </button>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 cursor-pointer"><X className="w-6 h-6" /></button>
          </div>
        </div>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Le tue campagne</h3>
                <p className="text-sm text-slate-500">{campaigns.length} campagne totali</p>
              </div>
              <button onClick={() => setView('create')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-500/30 cursor-pointer transition-all">
                <Plus className="w-4 h-4" /> Nuova Campagna
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400">Caricamento...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl">
                <Send className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">Nessuna campagna ancora.</p>
                <p className="text-slate-400 text-sm mt-1">Crea la tua prima campagna email massiva.</p>
                <button onClick={() => setView('create')} className="mt-4 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl cursor-pointer hover:bg-indigo-700">
                  Crea campagna
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {campaigns.map(c => (
                  <div key={c.id} className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-extrabold text-slate-900">{c.name}</h4>
                          {statusBadge(c.status)}
                        </div>
                        <p className="text-xs text-slate-400">Creata: {new Date(c.createdAt).toLocaleString('it-IT')}{c.sentAt ? ` · Inviata: ${new Date(c.sentAt).toLocaleString('it-IT')}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(c.status === 'draft' || c.status === 'paused') && (
                          <button onClick={() => handleSend(c)} disabled={sending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                            <Send className="w-3.5 h-3.5" /> Invia
                          </button>
                        )}
                        <button onClick={() => openDetail(c)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer">
                          Dettagli <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteCampaign(c.id)}
                          className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats bar */}
                    <div className="mt-4 grid grid-cols-4 gap-3">
                      {[
                        { icon: <Mail className="w-4 h-4" />, label: 'Inviati', val: c.totalSent, color: 'text-slate-600 bg-slate-50' },
                        { icon: <Eye className="w-4 h-4" />, label: 'Aperti', val: c.totalOpened, pctVal: pct(c.totalOpened, c.totalSent), color: 'text-blue-600 bg-blue-50' },
                        { icon: <MousePointer className="w-4 h-4" />, label: 'Click', val: c.totalClicked, pctVal: pct(c.totalClicked, c.totalSent), color: 'text-violet-600 bg-violet-50' },
                        { icon: <MessageCircle className="w-4 h-4" />, label: 'Risposte', val: c.totalReplied, pctVal: pct(c.totalReplied, c.totalSent), color: 'text-emerald-600 bg-emerald-50' },
                      ].map((s, i) => (
                        <div key={i} className={`${s.color} rounded-xl p-3 flex flex-col items-center gap-1`}>
                          {s.icon}
                          <span className="text-lg font-black">{s.val}</span>
                          {s.pctVal && <span className="text-[10px] font-bold opacity-70">{s.pctVal}</span>}
                          <span className="text-[10px] font-semibold opacity-60">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CREATE VIEW ── */}
        {view === 'create' && (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Nuova Campagna Email</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Config */}
              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nome Campagna *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="es. Promo Fotovoltaico Agosto 2026"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Template Email *</label>
                  <select value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white">
                    <option value="">— Seleziona template —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>)}
                  </select>
                  {templates.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠️ Nessun template disponibile. Crea un template prima.</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Account SMTP (mittente) *</label>
                  <select value={form.smtpId} onChange={e => setForm(p => ({ ...p, smtpId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white">
                    <option value="">— Seleziona account —</option>
                    {smtpAccounts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.user_email})</option>)}
                  </select>
                  {smtpAccounts.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠️ Nessun account SMTP. Configuralo nelle impostazioni.</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Ritardo tra invii: <span className="text-indigo-600">{form.sendDelay} sec</span>
                  </label>
                  <input type="range" min={0} max={30} step={1} value={form.sendDelay}
                    onChange={e => setForm(p => ({ ...p, sendDelay: Number(e.target.value) }))}
                    className="w-full accent-indigo-600" />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0s (veloce, rischio spam)</span><span>30s (sicuro)</span>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-indigo-800 mb-1">📊 Riepilogo</p>
                  <ul className="text-xs text-indigo-700 space-y-1">
                    <li>Destinatari selezionati: <strong>{selectedLeadIds.length}</strong></li>
                    <li>Template: <strong>{templates.find(t => t.id === form.templateId)?.name || '—'}</strong></li>
                    <li>Mittente: <strong>{smtpAccounts.find(s => s.id === form.smtpId)?.user_email || '—'}</strong></li>
                    <li>Tempo stimato: <strong>{Math.ceil(selectedLeadIds.length * form.sendDelay / 60)} min</strong></li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setView('list')} className="flex-1 border border-slate-200 text-slate-600 font-bold text-sm py-2.5 rounded-xl cursor-pointer hover:bg-slate-50">
                    Annulla
                  </button>
                  <button onClick={handleCreateCampaign} disabled={creatingCampaign}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                    <Plus className="w-4 h-4" />
                    {creatingCampaign ? 'Creazione...' : 'Crea Campagna'}
                  </button>
                </div>
              </div>

              {/* Right: Lead selection */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Seleziona Destinatari ({selectedLeadIds.length} selezionati)
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedLeadIds(filteredLeads.map(l => l.id))}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">Tutti</button>
                    <button onClick={() => setSelectedLeadIds([])}
                      className="text-xs font-bold text-slate-400 hover:underline cursor-pointer">Nessuno</button>
                  </div>
                </div>

                <input type="text" value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                  placeholder="Cerca per nome, azienda o email..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />

                <p className="text-xs text-slate-400">Mostrati solo i lead con email. {leads.length} lead con email disponibili.</p>

                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
                  {filteredLeads.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">Nessun lead trovato</div>
                  ) : (
                    filteredLeads.map(lead => {
                      const checked = selectedLeadIds.includes(lead.id);
                      return (
                        <label key={lead.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${checked ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleLead(lead.id)}
                            className="w-4 h-4 accent-indigo-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{lead.name}</p>
                            {lead.company && <p className="text-xs text-slate-400 truncate">{lead.company}</p>}
                            <p className="text-xs text-indigo-600 truncate">{lead.email}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            lead.status === 'Interessato' ? 'bg-emerald-50 text-emerald-700' :
                            lead.status === 'Nuovo' ? 'bg-blue-50 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>{lead.status}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === 'detail' && selectedCampaign && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Campaign header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-800">{selectedCampaign.name}</h3>
                  {statusBadge(selectedCampaign.status)}
                </div>
                <p className="text-xs text-slate-400">
                  Creata il {new Date(selectedCampaign.createdAt).toLocaleString('it-IT')}
                  {selectedCampaign.sentAt ? ` · Inviata il ${new Date(selectedCampaign.sentAt).toLocaleString('it-IT')}` : ''}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(selectedCampaign.status === 'draft' || selectedCampaign.status === 'paused') && (
                  <button onClick={() => handleSend(selectedCampaign)} disabled={sending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50">
                    <Send className="w-4 h-4" /> {sending ? 'Avvio...' : 'Avvia Invio'}
                  </button>
                )}
                <button onClick={handleCheckImap}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs">
                  <MessageCircle className="w-4 h-4" /> Controlla Risposte (IMAP)
                </button>
                <button onClick={() => refreshDetail(selectedCampaign.id)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer">
                  <RefreshCw className="w-4 h-4" /> Aggiorna
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: <Mail className="w-5 h-5" />, label: 'Inviati', val: selectedCampaign.totalSent, color: 'from-slate-500 to-slate-600' },
                { icon: <Eye className="w-5 h-5" />, label: 'Aperti', val: selectedCampaign.totalOpened, sub: pct(selectedCampaign.totalOpened, selectedCampaign.totalSent), color: 'from-blue-500 to-blue-600' },
                { icon: <MousePointer className="w-5 h-5" />, label: 'Click', val: selectedCampaign.totalClicked, sub: pct(selectedCampaign.totalClicked, selectedCampaign.totalSent), color: 'from-violet-500 to-violet-600' },
                { icon: <MessageCircle className="w-5 h-5" />, label: 'Risposte', val: selectedCampaign.totalReplied, sub: pct(selectedCampaign.totalReplied, selectedCampaign.totalSent), color: 'from-emerald-500 to-emerald-600' },
              ].map((s, i) => (
                <div key={i} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-4 flex flex-col gap-1`}>
                  {s.icon}
                  <span className="text-3xl font-black">{s.val}</span>
                  {s.sub && <span className="text-sm font-bold opacity-80">{s.sub}</span>}
                  <span className="text-xs opacity-70">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Recipients table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-700">Destinatari ({recipients.length})</h4>
                <button onClick={() => setSortByTemp(v => !v)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${sortByTemp ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600'}`}>
                  <Flame className="w-3.5 h-3.5" />
                  {sortByTemp ? 'Ordine Priorità ON' : 'Ordina per Priorità 🔥'}
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Lead</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-slate-500 uppercase">Stato</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-blue-500 uppercase">Aperta</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-violet-500 uppercase">Click</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-emerald-500 uppercase">Risposta</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-orange-500 uppercase">Priorità</th>
                        <th className="px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedRecipients.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-slate-400">Nessun destinatario</td></tr>
                      ) : sortedRecipients.map(r => {
                        const temp = r.temperature || 0;
                        const tLabel = temperatureLabel(temp);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{r.leadName}</p>
                              <p className="text-xs text-slate-500">{r.email}</p>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {r.status === 'sent' ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> :
                               r.status === 'failed' ? <XCircle className="w-4 h-4 text-rose-500 mx-auto" title={r.errorMsg} /> :
                               <Clock className="w-4 h-4 text-slate-300 mx-auto" />}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {r.openedAt ? (
                                <div className="flex flex-col items-center">
                                  <Eye className="w-4 h-4 text-blue-500" />
                                  <span className="text-[10px] text-slate-400">{new Date(r.openedAt).toLocaleDateString('it-IT')}</span>
                                </div>
                              ) : r.status === 'sent' ? (
                                <button onClick={() => handleTestOpen(r.id)}
                                  title="Fai click per registrare la simulazione di apertura"
                                  className="text-[10px] font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer border border-dashed border-slate-200 hover:border-blue-300 transition-all">
                                  — (Test 👁️)
                                </button>
                              ) : <span className="text-slate-200">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {r.clickedAt ? (
                                <div className="flex flex-col items-center">
                                  <MousePointer className="w-4 h-4 text-violet-500" />
                                  <span className="text-[10px] text-slate-400">{new Date(r.clickedAt).toLocaleDateString('it-IT')}</span>
                                </div>
                              ) : <span className="text-slate-200">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {r.repliedAt ? (
                                <div className="flex flex-col items-center gap-1">
                                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                                  <span className="text-[10px] text-slate-400">{new Date(r.repliedAt).toLocaleDateString('it-IT')}</span>
                                  {r.replyText && (
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 max-w-[120px] truncate block" title={r.replyText}>
                                      "{r.replyText.slice(0, 30)}..."
                                    </span>
                                  )}
                                </div>
                              ) : <span className="text-slate-200">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${tLabel.color}`}>
                                {tLabel.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {onOpenLead && (
                                <button onClick={() => onOpenLead(r.leadId)}
                                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">
                                  Scheda
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
