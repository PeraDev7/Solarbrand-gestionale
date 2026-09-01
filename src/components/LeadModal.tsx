import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Lead, Colleague } from '../types';
import { X, User, Phone, Mail, Building, Tag, Check, Award, MapPin, PhoneCall, Users } from 'lucide-react';

interface LeadModalProps {
  lead?: Lead | null;
  colleagueObjects: Colleague[];   // oggetti completi con name + role
  services: string[];
  activeColleague: string;
  onClose: () => void;
  onSave: () => void;
}

export default function LeadModal({ lead, colleagueObjects, services, activeColleague, onClose, onSave }: LeadModalProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<Lead['status']>('Nuovo');
  const [type, setType] = useState<Lead['type']>('Lead');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [assignedColleague, setAssignedColleague] = useState('');       // agente (venditore)
  const [assignedTelefonisti, setAssignedTelefonisti] = useState<string[]>([]); // telefonisti (multipli)
  const [initialNotes, setInitialNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Separazione per ruolo
  const telefonisti = colleagueObjects.filter(c => c.role === 'telefonista' || c.role === 'admin');
  const venditori = colleagueObjects.filter(c => c.role === 'venditore');

  useEffect(() => {
    if (lead) {
      setName(lead.name || '');
      setCompany(lead.company || '');
      setPhone(lead.phone || '');
      setEmail(lead.email || '');
      setAddress(lead.address || '');
      setStatus(lead.status || 'Nuovo');
      setType(lead.type || 'Lead');
      setSelectedServices(lead.services || (lead.service ? [lead.service] : []));
      setAssignedColleague(lead.assignedColleague || '');
      setAssignedTelefonisti(lead.assignedTelefonisti || []);
    } else {
      setName('');
      setCompany('');
      setPhone('');
      setEmail('');
      setAddress('');
      setStatus('Nuovo');
      setType('Lead');
      setSelectedServices([]);
      setAssignedTelefonisti([]);
      setAssignedColleague('');
      setInitialNotes('');
    }
  }, [lead, activeColleague]);

  const toggleService = (srv: string) => {
    setSelectedServices(prev =>
      prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]
    );
  };

  const toggleTelefonista = (n: string) => {
    setAssignedTelefonisti(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  };

  const [showClosedConfirmModal, setShowClosedConfirmModal] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return alert('Il nome è obbligatorio');
    if (status === 'Chiuso con successo' && (!lead || lead.status !== 'Chiuso con successo')) {
      setShowClosedConfirmModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setShowClosedConfirmModal(false);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        company: company.trim(),
        phone: phone.trim(),
        email: email.trim(),
        status,
        type,
        service: selectedServices[0] || '',
        services: selectedServices,
        assignedColleague: assignedColleague,
        assignedTelefonisti: assignedTelefonisti,
        notes: initialNotes.trim(),
        address: address.trim(),
      };

      if (lead) {
        await api.updateLead(lead.id, payload);
      } else {
        await api.createLead(payload);
      }
      onSave();
    } catch (e: any) {
      alert('Errore: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {lead ? 'Modifica Contatto' : 'Crea Nuovo Lead'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome e Cognome *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Mario Rossi"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Telefono</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+39 333 1234567"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="mario.rossi@email.com"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Azienda</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Building className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Azienda Srl"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Indirizzo (Via, Civico, Città)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <MapPin className="w-4 h-4 text-indigo-500" />
              </span>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="es. Via Roma 15, Milano"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo Contatto</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'Lead' | 'Cliente')}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="Lead">Lead</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Stato</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Lead['status'])}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="Nuovo">⚪ Nuovo</option>
                <option value="Chiamato - Nessuna Risposta">🟡 Nessuna Risposta</option>
                <option value="Da richiamare">🔵 Da richiamare</option>
                <option value="Interessato">🟢 Interessato</option>
                <option value="Non interessato">🔴 Non interessato</option>
                <option value="Chiuso con successo">🏆 Chiuso con successo</option>
              </select>
            </div>
          </div>

          {/* ── ASSEGNAZIONE TELEFONISTI (multi-checkbox) ── */}
          {telefonisti.length > 0 && (
            <div className="border border-violet-100 rounded-2xl p-4 bg-violet-50/40">
              <label className="text-xs font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <PhoneCall className="w-3.5 h-3.5" />
                Telefonisti Assegnati
              </label>
              <div className="flex flex-wrap gap-2">
                {telefonisti.map(c => {
                  const isChecked = assignedTelefonisti.includes(c.name);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleTelefonista(c.name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isChecked
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                      {c.name}
                    </button>
                  );
                })}
              </div>
              {assignedTelefonisti.length === 0 && (
                <p className="text-xs text-violet-400 mt-2 italic">Nessun telefonista assegnato</p>
              )}
            </div>
          )}

          {/* ── AGENTE COMMERCIALE (singolo dropdown) ── */}
          {venditori.length > 0 && (
            <div className="border border-amber-100 rounded-2xl p-4 bg-amber-50/40">
              <label className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Users className="w-3.5 h-3.5" />
                Agente Commerciale
              </label>
              <select
                value={assignedColleague}
                onChange={e => setAssignedColleague(e.target.value)}
                className="w-full bg-white border border-amber-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all"
              >
                <option value="">-- Nessun agente assegnato --</option>
                {venditori.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipologie di Interesse</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {services.map(srv => {
                const isSelected = selectedServices.includes(srv);
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => toggleService(srv)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {srv}
                  </button>
                );
              })}
            </div>
          </div>

          {!lead && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nota Iniziale (Opzionale)</label>
              <textarea
                value={initialNotes}
                onChange={e => setInitialNotes(e.target.value)}
                placeholder="Inserisci eventuali dettagli o note iniziali..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Salvataggio...' : 'Salva Lead'}
          </button>
        </div>

      </div>

      {/* Closed with success confirmation modal */}
      {showClosedConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🏆
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">Conferma Chiusura Contratto</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Impostando lo stato su <strong>Chiuso con successo</strong>, verrà inviata un'email automatica al cliente <strong>{name}</strong> con una richiesta di recensione e un voto in stelline per l'agente <strong>{assignedColleague || 'assegnato'}</strong>.
              </p>
              <p className="text-[11px] text-emerald-800 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                ⭐ Il voto del cliente influirà direttamente sulla media stelline dell'agente!
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClosedConfirmModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 text-xs rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 text-xs rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Conferma &amp; Invia Recensione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
