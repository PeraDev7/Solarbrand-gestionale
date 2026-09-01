import React, { useState, useEffect, useCallback } from 'react';
import { Session, Appointment, Lead, Colleague } from '../types';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import VisitReportForm from './VisitReportForm';
import VendorReports from './VendorReports';
import LeadDetail from './LeadDetail';
import { 
  Briefcase, Calendar, FileText, Users, LogOut, CheckCircle, Clock, 
  AlertCircle, ChevronRight, Building, Phone, Mail, ArrowRight, ShieldCheck, Star, MapPin, ExternalLink
} from 'lucide-react';

interface Props {
  session: Session;
  onLogout: () => void;
}

export default function VendorApp({ session, onLogout }: Props) {
  const [currentTab, setCurrentTab] = useState<'appointments' | 'leads' | 'reports'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [colleagueInfo, setColleagueInfo] = useState<Colleague | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedAppointmentForReport, setSelectedAppointmentForReport] = useState<Appointment | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // Telefonisti usano ?telefonistName=, venditori usano ?vendorName=
      const isTelefonista = session.role === 'telefonista';
      const [apptsData, leadsData, colsData] = await Promise.all([
        api.getAppointments(session.name),
        isTelefonista
          ? api.getLeads(undefined, session.name)
          : api.getLeads(session.name),
        api.getColleagues(),
      ]);
      setAppointments(apptsData);
      setLeads(leadsData);
      const myCol = colsData.find((c: any) => c.name === session.name || c.id === session.id);
      if (myCol) setColleagueInfo(myCol);
    } catch (err) {
      console.error('Error loading vendor data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [session.name, session.id]);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleOpenGoogleConnect = () => {
    const token = auth.getToken();
    if (!token) return;
    window.open(
      `/api/auth/google/start?vendorId=${encodeURIComponent(session.id)}&token=${encodeURIComponent(token)}`,
      '_blank',
      'width=500,height=600'
    );
    // The OAuth popup redirects back to our server and closes itself; refresh
    // our own colleague info afterwards to pick up the new connected state.
    setTimeout(loadData, 3000);
  };

  const handleDisconnectGoogle = async () => {
    await api.disconnectGoogleCalendar(session.id).catch(() => {});
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Vendor Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-md shadow-amber-500/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">SolarBrand <span className="text-amber-600">Venditore</span></h1>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Area Agenti
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs text-slate-500 font-medium">Operatore: <strong>{session.name}</strong></p>
                {colleagueInfo && (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-extrabold px-2.5 py-0.5 rounded-xl">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{colleagueInfo.avgRating ? Number(colleagueInfo.avgRating).toFixed(1) : '0.0'}</span>
                    <span className="text-[10px] text-amber-700 font-semibold">({colleagueInfo.reviewCount || 0} recensioni)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            {colleagueInfo?.googleCalendarConnected ? (
              <button
                onClick={handleDisconnectGoogle}
                className="bg-emerald-50 hover:bg-rose-50 hover:text-rose-600 text-emerald-700 border border-emerald-200 hover:border-rose-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Google Calendar collegato — clicca per scollegare"
              >
                <Calendar className="w-4 h-4" />
                Google Calendar Collegato
              </button>
            ) : (
              <button
                onClick={handleOpenGoogleConnect}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Collega il tuo Google Calendar personale"
              >
                <Calendar className="w-4 h-4 text-indigo-600" />
                Collega Google Calendar
              </button>
            )}

            <button
              onClick={onLogout}
              className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>

        </div>
      </header>

      {/* Navigation tabs */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        <div className="flex bg-slate-200/80 p-1 rounded-2xl w-full sm:max-w-md overflow-x-auto scrollbar-none">
          {[
            { id: 'appointments', label: 'Appuntamenti', icon: Calendar },
            { id: 'leads', label: 'I Miei Lead', icon: Users },
            { id: 'reports', label: 'Schede Visita', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Appointments */}
        {currentTab === 'appointments' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Appuntamenti & Sopralluoghi Assegnati</h2>
                <p className="text-xs text-slate-400 font-medium">Assegnati dall'ufficio telefonico</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Caricamento appuntamenti...</div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">Nessun appuntamento attualmente assegnato a te.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appointments.map(appt => {
                  const isDone = appt.visitStatus === 'completed';
                  return (
                    <div key={appt.id} className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                      isDone ? 'bg-slate-50/50 border-slate-200' : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
                    }`}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                            isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isDone ? 'Completato' : 'In attesa'}
                          </span>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(appt.dateTime).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-base">{appt.leadName}</h3>
                        
                        {(() => {
                          const matchedLead = leads.find(l => l.id === appt.leadId);
                          if (!matchedLead?.address) return null;
                          return (
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(matchedLead.address)}&t=k`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg w-fit transition-colors group cursor-pointer"
                              title="Apri in Google Maps (Vista Satellitare)"
                            >
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{matchedLead.address}</span>
                              <ExternalLink className="w-3 h-3 opacity-60 ml-0.5 flex-shrink-0" />
                            </a>
                          );
                        })()}

                        {appt.notes && (
                          <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                            "{appt.notes}"
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            const foundLead = leads.find(l => l.id === appt.leadId);
                            if (foundLead) setSelectedLead(foundLead);
                          }}
                          className="text-xs text-indigo-600 font-bold hover:underline"
                        >
                          Dettagli Lead
                        </button>

                        <button
                          onClick={() => setSelectedAppointmentForReport(appt)}
                          className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                            isDone 
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {isDone ? 'Modifica Report' : 'Compila Report'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Leads */}
        {currentTab === 'leads' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">Lead Assegnati ai Tuoi Appuntamenti</h2>
            
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Caricamento lead...</div>
            ) : leads.length === 0 ? (
              <div className="text-center py-16 text-slate-400">Nessun lead associato.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leads.map(lead => (
                  <div key={lead.id} className="border border-slate-200 p-5 rounded-2xl hover:bg-slate-50/50 transition-colors flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-slate-900">{lead.name}</h3>
                      {lead.company && <p className="text-xs text-slate-400 font-medium flex items-center gap-1"><Building className="w-3.5 h-3.5" />{lead.company}</p>}
                      {lead.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(lead.address)}&t=k`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mt-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg w-fit transition-colors group cursor-pointer"
                          title="Apri in Google Maps (Vista Satellitare)"
                        >
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{lead.address}</span>
                          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5 flex-shrink-0" />
                        </a>
                      )}
                      <p className="text-xs text-slate-600 font-semibold mt-1 flex items-center gap-2">
                        <span>📞 {lead.phone}</span>
                        {lead.email && <span>✉️ {lead.email}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      Apri <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reports */}
        {currentTab === 'reports' && (
          <VendorReports 
            vendorName={session.name}
            leads={leads}
            onEditReport={(apptId) => {
              const appt = appointments.find(a => a.id === apptId);
              if (appt) setSelectedAppointmentForReport(appt);
            }}
            onViewLead={(leadId) => {
              const lead = leads.find(l => l.id === leadId);
              if (lead) setSelectedLead(lead);
            }}
          />
        )}

      </main>

      {/* Modal Report Visita */}
      {selectedAppointmentForReport && (
        <VisitReportForm
          appointment={selectedAppointmentForReport}
          lead={leads.find(l => l.id === selectedAppointmentForReport.leadId)}
          vendorName={session.name}
          onClose={() => setSelectedAppointmentForReport(null)}
          onSaved={() => {
            setSelectedAppointmentForReport(null);
            loadData();
          }}
        />
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 border-l border-slate-200">
          <LeadDetail
            lead={selectedLead}
            activeColleague={session.name}
            colleagues={[session.name]}
            googleToken={null}
            onClose={() => setSelectedLead(null)}
            onUpdateLead={(updated) => {
              setSelectedLead(updated);
              loadData();
            }}
            onTriggerGoogleLogin={async () => null}
          />
        </div>
      )}

    </div>
  );
}
