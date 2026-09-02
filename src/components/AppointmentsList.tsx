import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Appointment, Lead, Colleague } from '../types';
import { Calendar, Clock, User, Phone, Trash2, ArrowRight, ExternalLink, Check, Filter, Briefcase, Search, Mail, CheckCircle2, Circle, X, XCircle, RotateCcw, ShieldAlert, UserCheck, MapPin } from 'lucide-react';

interface AppointmentsListProps {
  googleToken: string | null;
  leads: Lead[];
  services: string[];
  colleagues: string[];
  activeColleague?: string;
  currentUserRole?: string;
  visibleColleagues?: string[];
  initialVendorFilter?: string;
  onSelectLead: (leadId: string) => void;
}

export default function AppointmentsList({ googleToken, leads, services, colleagues, activeColleague, currentUserRole, visibleColleagues, initialVendorFilter = 'Tutti', onSelectLead }: AppointmentsListProps) {
  const isTelefonista = currentUserRole === 'telefonista';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allColleagueObjs, setAllColleagueObjs] = useState<Colleague[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<'Tutti' | 'Lead' | 'Cliente'>('Tutti');
  const [serviceFilter, setServiceFilter] = useState<string>('Tutti');
  const [vendorFilter, setVendorFilter] = useState<string>(initialVendorFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastAppointments, setShowPastAppointments] = useState(false);
  const [showAllTelephonists, setShowAllTelephonists] = useState(false);

  useEffect(() => {
    if (initialVendorFilter) {
      setVendorFilter(initialVendorFilter);
    }
  }, [initialVendorFilter]);

  const fetchAppointments = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [items, cols] = await Promise.all([
        api.getAppointments(),
        api.getColleagues(),
      ]);
      setAppointments(items.map(a => ({
        ...a,
        completed: a.completed === 'true' ? true : a.completed === 'cancelled' ? 'cancelled' : false
      })));
      setAllColleagueObjs(cols);
    } catch (e) {
      console.error('Error loading appointments:', e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(true);
    const interval = setInterval(() => fetchAppointments(false), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleAssignVendor = async (apptId: string, vendorName: string) => {
    try {
      await api.updateAppointment(apptId, { assignedVendor: vendorName });
      fetchAppointments();
    } catch (err) {
      console.error('Error assigning vendor:', err);
    }
  };

  const handleComplete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateAppointment(id, { completed: 'true' });
      fetchAppointments();
    } catch (err) {
      console.error('Error completing appointment:', err);
    }
  };

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateAppointment(id, { completed: 'cancelled' });
      fetchAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteAppointment(id);
      fetchAppointments();
    } catch (err) {
      console.error('Error deleting appointment:', err);
    }
  };

  const vendors = allColleagueObjs.filter(c => c.role === 'venditore');

  const filteredAppointments = appointments.filter(app => {
    // Un telefonista (non admin) vede gli appuntamenti creati da lui o relativi ai lead a lui assegnati
    if (isTelefonista) {
      if (activeColleague) {
        const isMyAppointment = app.colleague && app.colleague.trim().toLowerCase() === activeColleague.trim().toLowerCase();
        const matchedLead = leads.find(l => l.id === app.leadId);
        const isMyLead = matchedLead?.assignedTelefonisti && matchedLead.assignedTelefonisti.some((t: string) => t.trim().toLowerCase() === activeColleague.trim().toLowerCase());
        if (!isMyAppointment && !isMyLead) {
          return false;
        }
      }
    } else if (activeColleague && !showAllTelephonists) {
      if (app.colleague && app.colleague !== activeColleague) return false;
    }

    const appDate = new Date(app.dateTime);
    const now = new Date();
    const isPast = appDate < now;

    if (isPast && !showPastAppointments) return false;

    const matchedLead = leads.find(l => l.id === app.leadId);
    
    if (typeFilter !== 'Tutti') {
      const leadType = matchedLead?.type || 'Lead';
      if (leadType !== typeFilter) return false;
    }

    if (serviceFilter !== 'Tutti') {
      const leadServices = matchedLead?.services || (matchedLead?.service ? [matchedLead.service] : []);
      if (!leadServices.includes(serviceFilter)) return false;
    }

    if (vendorFilter !== 'Tutti') {
      if (app.assignedVendor !== vendorFilter) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = app.leadName?.toLowerCase().includes(query);
      const matchTitle = app.title?.toLowerCase().includes(query);
      const matchColleague = app.colleague?.toLowerCase().includes(query);
      const matchVendor = app.assignedVendor?.toLowerCase().includes(query);
      if (!matchName && !matchTitle && !matchColleague && !matchVendor) return false;
    }

    return true;
  });

  const callsList = filteredAppointments.filter(app => 
    app.appointmentType === 'call' || (app.title && app.title.toLowerCase().includes('richiamo'))
  );

  const visitsList = filteredAppointments.filter(app => 
    app.appointmentType !== 'call' && (!app.title || !app.title.toLowerCase().includes('richiamo'))
  );

  const renderApptCard = (app: Appointment, isVisit: boolean) => {
    const appDate = new Date(app.dateTime);
    const isCompleted = app.completed === true;
    const isCancelled = app.completed === 'cancelled';
    const matchedLead = leads.find(l => l.id === app.leadId);

    return (
      <div
        key={app.id}
        onClick={() => onSelectLead(app.leadId)}
        className={`border rounded-2xl p-4 transition-all cursor-pointer space-y-3 relative group ${
          isCancelled
            ? 'bg-slate-50 border-slate-200 opacity-60'
            : isCompleted
            ? 'bg-emerald-50/40 border-emerald-200'
            : isVisit
            ? 'bg-white border-amber-200 hover:border-amber-400 hover:shadow-md'
            : 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-md'
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isVisit ? 'bg-amber-100 text-amber-900' : 'bg-indigo-100 text-indigo-900'
              }`}>
                {isVisit ? '🏠 Sopralluogo' : '📞 Richiamo'}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Fissato da: {app.colleague || 'Ufficio'}
              </span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">{app.leadName}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {matchedLead?.phone && (
                <a
                  href={`tel:${matchedLead.phone}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-1 bg-slate-50 hover:bg-indigo-50 px-2 py-0.5 rounded-md transition-colors"
                  title="Chiama numero"
                >
                  <Phone className="w-3 h-3 text-emerald-600" /> {matchedLead.phone}
                </a>
              )}
              {matchedLead?.email && (
                <a
                  href={`mailto:${matchedLead.email}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1 bg-slate-50 hover:bg-indigo-50 px-2 py-0.5 rounded-md transition-colors truncate max-w-[200px]"
                  title="Invia email"
                >
                  <Mail className="w-3 h-3 text-indigo-500" /> <span className="truncate">{matchedLead.email}</span>
                </a>
              )}
            </div>
            {matchedLead?.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(matchedLead.address)}&t=k`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mt-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md w-fit transition-colors group cursor-pointer"
                title="Apri in Google Maps (Vista Satellitare)"
              >
                <MapPin className="w-3 h-3 text-indigo-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate max-w-[180px]">{matchedLead.address}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5 flex-shrink-0" />
              </a>
            )}
          </div>
          <button
            onClick={(e) => handleDelete(app.id, e)}
            className="text-slate-300 hover:text-rose-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            title="Elimina Appuntamento"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl w-fit ${
          isVisit ? 'bg-amber-50 text-amber-900' : 'bg-indigo-50 text-indigo-900'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {appDate.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>

        {app.title && (
          <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
            "{app.title}"
          </p>
        )}

        {isVisit && (
          <div 
            onClick={e => e.stopPropagation()} 
            className="pt-2 border-t border-slate-100 flex items-center justify-between"
          >
            <span className="text-[11px] font-bold text-slate-500">Agente Assegnato:</span>
            <select
              value={app.assignedVendor || ''}
              onChange={e => handleAssignVendor(app.id, e.target.value)}
              className="bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="">-- Seleziona Agente --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Calendario Appuntamenti & Sopralluoghi
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Gestisci i richiami telefonici dell'ufficio e i sopralluoghi degli Agenti Commerciali
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Telephonist Filter Toggle (Solo per Admin) */}
          {!isTelefonista && activeColleague && (
            <button
              onClick={() => setShowAllTelephonists(!showAllTelephonists)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showAllTelephonists
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              {showAllTelephonists ? 'Vedi Tutti i Telefonisti' : `Solo Miei (${activeColleague})`}
            </button>
          )}

          {isTelefonista && activeColleague && (
            <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>I Miei Appuntamenti ({activeColleague})</span>
            </div>
          )}

          {/* Vendor Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
            <UserCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span className="text-[11px] font-bold text-amber-900">Agente:</span>
            <select
              value={vendorFilter}
              onChange={e => setVendorFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-black text-amber-900 focus:outline-none cursor-pointer"
            >
              <option value="Tutti">Tutti gli Agenti</option>
              {vendors.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowPastAppointments(!showPastAppointments)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showPastAppointments
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showPastAppointments ? 'Solo Futuri' : 'Includi Passati'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 font-medium">Caricamento appuntamenti...</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400 italic bg-slate-50 rounded-2xl space-y-2">
          <Calendar className="w-8 h-8 mx-auto text-slate-300" />
          <p>Nessun appuntamento trovato con i filtri correnti.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SEZIONE 1: RICHIAMI TELEFONICI UFFICIO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-800 p-1.5 rounded-lg">📞</span>
                Richiami Telefonici Ufficio ({callsList.length})
              </h3>
            </div>
            {callsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">Nessun richiamo telefonico programmato in questa lista.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {callsList.map(app => renderApptCard(app, false))}
              </div>
            )}
          </div>

          {/* SEZIONE 2: SOPRALLUOGHI FISICI AGENTI */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 p-1.5 rounded-lg">🏠</span>
                Sopralluoghi Fisici per Agenti Commerciali ({visitsList.length})
              </h3>
            </div>
            {visitsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">Nessun sopralluogo per agenti in questa lista.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visitsList.map(app => renderApptCard(app, true))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
