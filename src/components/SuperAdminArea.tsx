import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Colleague, Service } from '../types';
import { Plus, Trash2, X, Users, Briefcase, Calendar, KeyRound, Check, Mail } from 'lucide-react';

interface SuperAdminAreaProps {
  onClose: () => void;
  onUpdate: () => void;
  onSelectVendorCalendar?: (vendorName: string) => void;
  currentColleagueId?: string;
}

export default function SuperAdminArea({ onClose, onUpdate, onSelectVendorCalendar, currentColleagueId }: SuperAdminAreaProps) {
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [newColleagueName, setNewColleagueName] = useState('');
  const [newColleagueEmail, setNewColleagueEmail] = useState('');
  const [newColleagueRole, setNewColleagueRole] = useState<'telefonista' | 'venditore' | 'admin'>('telefonista');
  const [newService, setNewService] = useState('');

  const [credentialsEditId, setCredentialsEditId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cols, servs] = await Promise.all([
        api.getColleagues(),
        api.getServices()
      ]);
      setColleagues(cols);
      setServices(servs);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addColleague = async () => {
    if (!newColleagueName.trim()) return;
    try {
      await api.createColleague({ name: newColleagueName.trim(), role: newColleagueRole, email: newColleagueEmail.trim() });
      setNewColleagueName('');
      setNewColleagueEmail('');
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore aggiunta utente');
    }
  };

  const updateRole = async (col: Colleague, role: 'telefonista' | 'venditore' | 'admin') => {
    try {
      await api.updateColleague(col.id, { role });
      await fetchData();
      onUpdate();
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
      await fetchData();
      onUpdate();
    } catch (err: any) {
      setEmailError(err.message || 'Errore aggiornamento email');
    }
  };

  const submitPassword = async (col: Colleague) => {
    if (newPassword.length < 6) {
      setPasswordError('Minimo 6 caratteri');
      return;
    }
    const adminPassword = window.prompt('Password amministratore per confermare la modifica:');
    if (!adminPassword) return;
    try {
      await api.setPassword(col.id, newPassword, adminPassword);
      setNewPassword('');
      setPasswordError('');
      await fetchData();
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

  const addService = async () => {
    if (!newService.trim()) return;
    try {
      await api.createService({ name: newService.trim() });
      setNewService('');
      await fetchData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Errore aggiunta servizio');
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
              <h2 className="text-xl font-extrabold text-slate-900">Gestione Team, Servizi & Ruoli Aziendali</h2>
              <p className="text-xs text-slate-500 font-medium">Configura i servizi trattati, gli operatori ed i ruoli aziendali</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Add User & Services */}
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
              </div>
            </div>

            {/* Services Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-500" />
                Servizi Trattati dall'Azienda
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nuovo servizio..."
                  value={newService}
                  onChange={e => setNewService(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
                <button onClick={addService} className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {services.map(srv => (
                  <span key={srv.id} className="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold shadow-xs">
                    {srv.name}
                  </span>
                ))}
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
                      <h4 className="font-extrabold text-slate-900 text-base">{col.name}</h4>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        col.role === 'venditore' ? 'bg-amber-100 text-amber-800' :
                        col.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {col.role === 'venditore' ? 'Agente' : col.role === 'admin' ? 'Admin' : 'Ufficio'}
                      </span>
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
                          setNewPassword('');
                          setPasswordError('');
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase w-24 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> Email login
                        </span>
                        <input
                          type="email"
                          placeholder="email@solarbrand.it"
                          value={emailDraft}
                          onChange={e => { setEmailDraft(e.target.value); setEmailError(''); }}
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

                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                        <span className="text-[11px] font-bold text-slate-500 uppercase w-24 flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5" /> Password
                        </span>
                        <input
                          type="password"
                          placeholder="Nuova password (min 6 caratteri)"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                        />
                        <button
                          onClick={() => submitPassword(col)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                        >
                          Salva Password
                        </button>
                        {passwordError && <span className="text-[11px] font-bold text-rose-600">{passwordError}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
