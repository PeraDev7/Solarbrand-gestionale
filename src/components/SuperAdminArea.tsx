import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Colleague, Service } from '../types';
import { Plus, Trash2, X, Users, Briefcase, Calendar, KeyRound, Check, Mail, Eye, EyeOff, UserCheck, Star, MessageSquare, Pencil } from 'lucide-react';

interface SuperAdminAreaProps {
  onClose: () => void;
  onUpdate: () => void;
  onSelectVendorCalendar?: (vendorName: string) => void;
  currentColleagueId?: string;
}

export default function SuperAdminArea({ onClose, onUpdate, onSelectVendorCalendar, currentColleagueId }: SuperAdminAreaProps) {
  const [activeTab, setActiveTab] = useState<'team' | 'reviews'>('team');
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newColleagueName, setNewColleagueName] = useState('');
  const [newColleagueEmail, setNewColleagueEmail] = useState('');
  const [newColleagueRole, setNewColleagueRole] = useState<'telefonista' | 'venditore' | 'admin'>('telefonista');
  const [newColleaguePassword, setNewColleaguePassword] = useState('');
  const [newService, setNewService] = useState('');
  const [colleagueSuccess, setColleagueSuccess] = useState('');

  const [credentialsEditId, setCredentialsEditId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savedPassword, setSavedPassword] = useState(''); // shows last saved password
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [roleSuccessId, setRoleSuccessId] = useState<string | null>(null);

  // Modifica nome operatore
  const [editingColleagueId, setEditingColleagueId] = useState<string | null>(null);
  const [editingColleagueName, setEditingColleagueName] = useState('');

  // Modifica nome tipologia
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cols, servs] = await Promise.all([
        api.getColleagues(),
        api.getServices(),
      ]);
      setColleagues(cols);
      setServices(servs);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }

    try {
      const revs = await api.getAdminReviews();
      setReviews(revs || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const addColleague = async () => {
    if (!newColleagueName.trim()) return;
    try {
      const created = await api.createColleague({ name: newColleagueName.trim(), role: newColleagueRole, email: newColleagueEmail.trim() });
      // If a password was provided, set it immediately
      if (newColleaguePassword.trim().length >= 6 && created?.id) {
        await api.setPassword(created.id, newColleaguePassword.trim());
      }
      setColleagueSuccess(`✅ Profilo di "${newColleagueName.trim()}" creato con successo!`);
      setNewColleagueName('');
      setNewColleagueEmail('');
      setNewColleaguePassword('');
      await fetchData();
      onUpdate();
      setTimeout(() => setColleagueSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Errore aggiunta utente');
    }
  };

  const updateRole = async (col: Colleague, role: 'telefonista' | 'venditore' | 'admin') => {
    try {
      await api.updateColleague(col.id, { role });
      setRoleSuccessId(col.id);
      await fetchData();
      onUpdate();
      setTimeout(() => setRoleSuccessId(null), 3000);
    } catch (err: any) {
      alert('Errore aggiornamento ruolo');
    }
  };

  const saveEmail = async (col: Colleague) => {
    if (!emailDraft.trim() || !emailDraft.includes('@')) {
      setEmailError('Inserisci un indirizzo email valido');
      return;
    }
    try {
      await api.updateColleague(col.id, { email: emailDraft.trim() });
      setEmailError('');
      setEmailSuccess(`✅ Email aggiornata: ${emailDraft.trim()}`);
      await fetchData();
      onUpdate();
      setTimeout(() => setEmailSuccess(''), 4000);
    } catch (err: any) {
      setEmailError(err.message || 'Errore aggiornamento email');
    }
  };

  const submitPassword = async (col: Colleague) => {
    if (newPassword.length < 6) {
      setPasswordError('Minimo 6 caratteri');
      return;
    }
    try {
      const pwdToSave = newPassword;
      await api.setPassword(col.id, pwdToSave);
      setSavedPassword(pwdToSave);
      setNewPassword('');
      setPasswordError('');
      setPasswordSuccess(`✅ Password salvata con successo!`);
      await fetchData();
      setTimeout(() => setPasswordSuccess(''), 6000);
    } catch (err: any) {
      setPasswordError(err.message || 'Errore impostazione password');
    }
  };

  const removeColleague = async (col: Colleague) => {
    if (col.id === currentColleagueId) return;
    if (!confirm(`Eliminare definitivamente il profilo di "${col.name}"? I lead e gli appuntamenti già assegnati a questa persona resteranno nello storico, ma non sarà più selezionabile.`)) return;
    try {
      await api.deleteColleague(col.id);
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore eliminazione profilo');
    }
  };

  const saveColleagueName = async (col: Colleague) => {
    const trimmed = editingColleagueName.trim();
    if (!trimmed) {
      alert('Il nome non può essere vuoto');
      return;
    }
    if (trimmed === col.name) {
      setEditingColleagueId(null);
      return;
    }
    try {
      await api.updateColleague(col.id, { name: trimmed });
      setEditingColleagueId(null);
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore aggiornamento nome operatore');
    }
  };

  const saveServiceName = async (srv: Service) => {
    const trimmed = editingServiceName.trim();
    if (!trimmed) {
      alert('Il nome della tipologia non può essere vuoto');
      return;
    }
    if (trimmed === srv.name) {
      setEditingServiceId(null);
      return;
    }
    try {
      await api.updateService(srv.id, { name: trimmed });
      setEditingServiceId(null);
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore aggiornamento nome tipologia');
    }
  };

  const addService = async () => {
    if (!newService.trim()) return;
    try {
      await api.createService({ name: newService.trim() });
      setNewService('');
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore aggiunta tipologia');
    }
  };

  const deleteService = async (srv: Service) => {
    if (!confirm(`Eliminare definitivamente la tipologia "${srv.name}"?`)) return;
    try {
      await api.deleteService(srv.id);
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore eliminazione tipologia');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Eliminare definitivamente questa recensione?')) return;
    try {
      await api.deleteAdminReview(reviewId);
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore eliminazione recensione');
    }
  };

  const handleClearAllReviews = async () => {
    if (!confirm('Sei sicuro di voler eliminare tutte le recensioni di test e azzerare le medie degli agenti?')) return;
    try {
      await api.clearAllReviews();
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore azzeramento recensioni');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-md shadow-indigo-600/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Gestione Team, Tipologie & Ruoli Aziendali</h2>
              <p className="text-xs text-slate-500 font-medium">Configura le tipologie trattate, gli operatori ed i ruoli aziendali</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 px-6 pt-4 shrink-0 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-white border border-b-white border-slate-200 text-indigo-700 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Team & Tipologie
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-white border border-b-white border-slate-200 text-amber-600 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Recensioni
            {reviews.filter(r => r.usedAt).length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {reviews.filter(r => r.usedAt).length}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB CONTENT ── */}
        {activeTab === 'reviews' ? (
          /* ── RECENSIONI PANEL ── */
          <div className="p-6 overflow-y-auto flex-1">
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Star className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-bold">Nessuna recensione ricevuta</p>
                <p className="text-xs mt-1">Le recensioni verranno generate automaticamente quando un lead viene chiuso con successo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary by agent */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {colleagues
                    .filter(c => c.role === 'venditore' && (c.reviewCount || 0) > 0)
                    .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
                    .map(col => (
                      <div key={col.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                        <div className="text-2xl font-black text-amber-500">{Number(col.avgRating || 0).toFixed(1)}</div>
                        <div className="flex justify-center gap-0.5 my-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= Math.round(col.avgRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                          ))}
                        </div>
                        <div className="text-xs font-bold text-slate-700 truncate">{col.name}</div>
                        <div className="text-[10px] text-slate-400">{col.reviewCount} recens.</div>
                      </div>
                    ))
                  }
                </div>

                {/* Review list */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-extrabold text-slate-700 text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    Tutte le recensioni ricevute ({reviews.filter(r => r.usedAt).length}/{reviews.length} compilate)
                  </h3>
                  {reviews.length > 0 && (
                    <button
                      onClick={handleClearAllReviews}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                      title="Cancella tutte le recensioni e azzera le medie"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Azzera Recensioni Test
                    </button>
                  )}
                </div>

                {reviews.map(rev => (
                  <div key={rev.id} className={`bg-white border rounded-2xl p-4 space-y-2 ${rev.usedAt ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-800">
                          {rev.leadName && !rev.leadName.includes('-') ? rev.leadName : (rev.leadName || 'Cliente rimosso')}
                        </span>
                        <span className="text-[10px] text-slate-400">→</span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{rev.vendorName}</span>
                        {rev.leadEmail && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {rev.leadEmail}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {rev.usedAt ? (
                          <>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-4 h-4 ${s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                              ))}
                            </div>
                            <span className="text-sm font-black text-amber-600">{rev.rating}/5</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">In attesa di risposta</span>
                        )}

                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer ml-1"
                          title="Elimina questa recensione"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 italic">
                        "{rev.comment}"
                      </p>
                    )}
                    <div className="text-[10px] text-slate-300">
                      Inviata: {new Date(rev.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {rev.usedAt && ` · Compilata: ${new Date(rev.usedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Add User & Tipologie */}
          <div className="space-y-6">
            
            {/* Add User Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Aggiungi Nuovo Operatore
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    placeholder="es. Mario Rossi"
                    value={newColleagueName}
                    onChange={e => setNewColleagueName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Email (per il login)</label>
                  <input
                    type="email"
                    placeholder="es. mario.rossi@solarbrand.it"
                    value={newColleagueEmail}
                    onChange={e => setNewColleagueEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Password iniziale (opzionale)</label>
                  <input
                    type="text"
                    placeholder="es. SolarBrand2026! (min 6 caratteri)"
                    value={newColleaguePassword}
                    onChange={e => setNewColleaguePassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Ruolo Operatore</label>
                  <select
                    value={newColleagueRole}
                    onChange={e => setNewColleagueRole(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="telefonista">📞 Operatore Ufficio</option>
                    <option value="venditore">💼 Agente Commerciale</option>
                    <option value="admin">🔑 Amministrazione</option>
                  </select>
                </div>

                <button
                  onClick={addColleague}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Crea Profilo
                </button>

                {/* Success banner for new colleague */}
                {colleagueSuccess && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    {colleagueSuccess}
                  </div>
                )}
              </div>
            </div>

            {/* Tipologie Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-500" />
                Tipologie Trattate dall'Azienda
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nuova tipologia..."
                  value={newService}
                  onChange={e => setNewService(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
                <button onClick={addService} className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {services.map(srv => {
                  const isEditing = editingServiceId === srv.id;
                  if (isEditing) {
                    return (
                      <span key={srv.id} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-slate-800 px-2 py-1 rounded-xl text-xs font-bold shadow-xs">
                        <input
                          type="text"
                          value={editingServiceName}
                          onChange={e => setEditingServiceName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveServiceName(srv);
                            if (e.key === 'Escape') setEditingServiceId(null);
                          }}
                          autoFocus
                          className="bg-white border border-amber-400 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-900 w-32 focus:outline-none"
                        />
                        <button
                          onClick={() => saveServiceName(srv)}
                          className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 p-1 rounded-md transition-colors cursor-pointer"
                          title="Salva nome tipologia"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingServiceId(null)}
                          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-md transition-colors cursor-pointer"
                          title="Annulla"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    );
                  }
                  return (
                    <span key={srv.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 pl-3 pr-1.5 py-1 rounded-xl text-xs font-bold shadow-xs group hover:border-slate-300">
                      <span>{srv.name}</span>
                      <button
                        onClick={() => {
                          setEditingServiceId(srv.id);
                          setEditingServiceName(srv.name);
                        }}
                        className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-0.5 rounded-md transition-colors cursor-pointer"
                        title="Modifica nome tipologia"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => deleteService(srv)}
                        className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-0.5 rounded-md transition-colors cursor-pointer"
                        title="Elimina tipologia"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: User List Panel */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Elenco Operatori Registrati ({colleagues.length})
            </h3>

            <div className="space-y-3">
              {colleagues.map(col => (
                <div key={col.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingColleagueId === col.id ? (
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-indigo-200 rounded-xl px-2 py-1">
                          <input
                            type="text"
                            value={editingColleagueName}
                            onChange={e => setEditingColleagueName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveColleagueName(col);
                              if (e.key === 'Escape') setEditingColleagueId(null);
                            }}
                            autoFocus
                            placeholder="Nome operatore..."
                            className="bg-white border border-indigo-400 rounded-lg px-2 py-1 text-sm font-extrabold text-slate-900 focus:outline-none"
                          />
                          <button
                            onClick={() => saveColleagueName(col)}
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Salva nome operatore"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingColleagueId(null)}
                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Annulla"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <h4 className="font-extrabold text-slate-900 text-base">{col.name}</h4>
                          <button
                            onClick={() => {
                              setEditingColleagueId(col.id);
                              setEditingColleagueName(col.name);
                            }}
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded-md transition-colors cursor-pointer"
                            title="Modifica nome operatore"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        col.role === 'venditore' ? 'bg-amber-100 text-amber-800' :
                        col.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {col.role === 'venditore' ? 'Agente' : col.role === 'admin' ? 'Admin' : 'Ufficio'}
                      </span>
                      {/* Role success flash */}
                      {roleSuccessId === col.id && (
                        <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                          <Check className="w-3 h-3" /> Ruolo aggiornato!
                        </span>
                      )}
                      {col.role === 'venditore' && (
                        <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black px-2 py-0.5 rounded-lg ml-1">
                          ⭐ {col.avgRating ? Number(col.avgRating).toFixed(1) : '0.0'} ({col.reviewCount || 0})
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-200">
                        <Mail className="w-3 h-3" /> {col.email || 'nessuna email'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        col.passwordSet ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}>
                        {col.passwordSet && <Check className="w-3 h-3" />}
                        {col.passwordSet ? 'Password impostata' : 'Password non impostata'}
                      </span>
                      {col.role === 'venditore' && col.googleCalendarConnected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Calendar className="w-3 h-3" /> Google Calendar collegato
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={col.role || 'telefonista'}
                        onChange={e => updateRole(col, e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 text-slate-700 cursor-pointer"
                      >
                        <option value="telefonista">Ruolo: Ufficio</option>
                        <option value="venditore">Ruolo: Agente</option>
                        <option value="admin">Ruolo: Admin</option>
                      </select>

                      <button
                        onClick={() => {
                          const opening = credentialsEditId !== col.id;
                          setCredentialsEditId(opening ? col.id : null);
                          setEmailDraft(opening ? (col.email || '') : '');
                          setEmailError('');
                          setEmailSuccess('');
                          setNewPassword('');
                          setSavedPassword('');
                          setPasswordError('');
                          setPasswordSuccess('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        title="Gestisci email e password di login"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Credenziali
                      </button>

                      {col.role === 'venditore' && (
                        <button
                          onClick={() => {
                            if (onSelectVendorCalendar) {
                              onSelectVendorCalendar(col.name);
                              onClose();
                            }
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                          title="Vedi calendario ed appuntamenti di questo Agente"
                        >
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          Vedi Appuntamenti
                        </button>
                      )}

                      <button
                        onClick={() => removeColleague(col)}
                        disabled={col.id === currentColleagueId}
                        title={col.id === currentColleagueId ? 'Non puoi eliminare il tuo stesso profilo' : 'Elimina definitivamente questo profilo'}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {credentialsEditId === col.id && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                      {/* Email row */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase w-24 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" /> Email login
                          </span>
                          <input
                            type="email"
                            placeholder="email@solarbrand.it"
                            value={emailDraft}
                            onChange={e => { setEmailDraft(e.target.value); setEmailError(''); setEmailSuccess(''); }}
                            className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                          />
                          <button
                            onClick={() => saveEmail(col)}
                            className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                          >
                            Salva Email
                          </button>
                          {emailError && <span className="text-[11px] font-bold text-rose-600">{emailError}</span>}
                        </div>
                        {/* Email success banner */}
                        {emailSuccess && (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            {emailSuccess}
                          </div>
                        )}
                      </div>

                      {/* Password row */}
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase w-24 flex items-center gap-1">
                            <KeyRound className="w-3.5 h-3.5" /> Password
                          </span>
                          <div className="flex-1 min-w-[180px] relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Nuova password (min 6 caratteri)"
                              value={newPassword}
                              onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 pr-9 py-2 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(v => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={showPassword ? 'Nascondi password' : 'Mostra password'}
                            >
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <button
                            onClick={() => submitPassword(col)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                          >
                            Salva Password
                          </button>
                          {passwordError && <span className="text-[11px] font-bold text-rose-600">{passwordError}</span>}
                        </div>

                        {/* Password success banner with saved password visible */}
                        {passwordSuccess && savedPassword && (
                          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2.5 rounded-xl">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <div>{passwordSuccess}</div>
                              <div className="mt-0.5 font-mono text-emerald-900 bg-emerald-100 rounded px-2 py-0.5 inline-block tracking-wide">
                                {savedPassword}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
        )} {/* end team tab */}
      </div>
    </div>
  );
}
