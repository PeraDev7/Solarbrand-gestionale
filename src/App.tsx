import React, { useState, useEffect, useCallback } from 'react';
import { Lead, Colleague, Session } from './types';
import { useLeads } from './lib/useLeads';
import { api } from './lib/api';
import { auth, localAuth, googleCalendar } from './lib/auth';

import LoginScreen from './components/LoginScreen';
import VendorApp from './components/VendorApp';

import LeadModal from './components/LeadModal';
import LeadDetail from './components/LeadDetail';
import AppointmentsList from './components/AppointmentsList';
import SuperAdminArea from './components/SuperAdminArea';

import TasksWidget from './components/TasksWidget';
import ImportLeadsModal from './components/ImportLeadsModal';
import EmailTemplateManager from './components/EmailTemplateManager';
import SmsTemplateManager from './components/SmsTemplateManager';
import SmtpSettingsManager from './components/SmtpSettingsManager';
import ImapSettingsManager from './components/ImapSettingsManager';
import EmailCampaignManager from './components/EmailCampaignManager';
import DashboardAlerts from './components/DashboardAlerts';
import ReportsView from './components/ReportsView';

import { 
  Users, User, Phone, MessageSquare, Search, Filter, Plus, Calendar, 
  Settings, LogIn, LogOut, Check, ArrowRight, PhoneCall, FileText, AlertCircle, Building, ShieldAlert, Briefcase, FileSpreadsheet, Mail, Server, Lock, X, Send
} from 'lucide-react';


export default function App() {
  const [session, setSession] = useState<Session | null>(auth.getSession());

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  if (session.role === 'venditore') {
    return (
      <VendorApp
        session={session}
        onLogout={() => {
          auth.logout();
          setSession(null);
        }}
      />
    );
  }

  return (
    <OfficeApp
      session={session}
      onLogout={() => {
        auth.logout();
        setSession(null);
      }}
    />
  );
}

function OfficeApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { leads, setLeads, loading: loadingLeads, refresh: refreshLeads } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [colleagueObjects, setColleagueObjects] = useState<Colleague[]>([]);
  const [colleagues, setColleagues] = useState<string[]>([]);
  const [activeColleague, setActiveColleague] = useState<string>(session.name);
  const [services, setServices] = useState<string[]>([]);

  const activeColleagueObj = colleagueObjects.find(c => c.name === activeColleague);
  const availableServices = activeColleagueObj?.services || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tutti');
  const [typeFilter, setTypeFilter] = useState<'Tutti' | 'Lead' | 'Cliente'>('Tutti');
  const [serviceFilter, setServiceFilter] = useState<string>('Tutti');
  const [colleagueFilter, setColleagueFilter] = useState<string>('Tutti');

  const [currentTab, setCurrentTab] = useState<'leads' | 'calendar' | 'reports'>('leads');
  const [selectedVendorForCalendar, setSelectedVendorForCalendar] = useState<string>('Tutti');

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showSuperAdminArea, setShowSuperAdminArea] = useState(false);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEmailTemplateManager, setShowEmailTemplateManager] = useState(false);
  const [showSmsTemplateManager, setShowSmsTemplateManager] = useState(false);
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);
  const [showImapSettings, setShowImapSettings] = useState(false);
  const [showEmailCampaigns, setShowEmailCampaigns] = useState(false);

  const [googleToken, setGoogleToken] = useState<string | null>(googleCalendar.getToken());

  const loadColleagues = useCallback(async () => {
    try {
      const data = await api.getColleagues();
      setColleagueObjects(data);
      const names = Array.from(new Set(data.map((c: Colleague) => c.name).filter(Boolean)));
      setColleagues(names);
    } catch (err) {
      console.error('Error fetching colleagues:', err);
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const data = await api.getServices();
      setServices(data.map((s: any) => s.name));
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }, []);

  useEffect(() => {
    loadColleagues();
    loadServices();
    const interval = setInterval(() => {
      loadColleagues();
      loadServices();
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadColleagues, loadServices]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.phone.includes(searchQuery) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'Tutti' || lead.status === statusFilter;
    const matchesType = typeFilter === 'Tutti' || lead.type === typeFilter;
    const leadHasServices = lead.services && lead.services.length > 0;
    const matchesService = serviceFilter === 'Tutti' 
      ? true 
      : (leadHasServices ? lead.services.includes(serviceFilter) : lead.service === serviceFilter);

    const matchesColleague = colleagueFilter === 'Tutti'
      ? true
      : colleagueFilter === '__unassigned__'
        ? (!lead.assignedColleague || lead.assignedColleague.trim() === '' || lead.assignedColleague === 'Nessuno' || lead.assignedColleague === 'Non assegnato')
        : lead.assignedColleague === colleagueFilter;

    return matchesSearch && matchesStatus && matchesType && matchesService && matchesColleague;
  });

  const handleSelectLeadById = (id: string) => {
    const found = leads.find(l => l.id === id);
    if (found) {
      setSelectedLead(found);
      setCurrentTab('leads');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">Gestionale Lead <span className="text-indigo-600">Ufficio</span></h1>
              <p className="text-[11px] text-slate-400 font-medium">Operatore: <strong>{session.name}</strong> ({session.role})</p>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
            
            {/* Operatore Attivo (Fisso sul login effettuato) */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 gap-2">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-extrabold text-slate-800">{session.name}</span>
            </div>

            {/* Team Manager Button — riservato ai profili con ruolo Admin */}
            {session.role === 'admin' && (
              <button
                onClick={() => setShowSuperAdminArea(true)}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200 p-2 rounded-xl transition-all cursor-pointer"
                title="Gestisci Collaboratori e Permessi"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Email Templates Button */}
            <button
              onClick={() => setShowEmailTemplateManager(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 p-2 rounded-xl transition-all cursor-pointer"
              title="Template Email"
            >
              <Mail className="w-4 h-4" />
            </button>
            
            {/* SMS Templates Button */}
            <button
              onClick={() => setShowSmsTemplateManager(true)}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 p-2 rounded-xl transition-all cursor-pointer"
              title="Template SMS"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* SMTP Settings Button */}
            <button
              onClick={() => setShowSmtpSettings(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 p-2 rounded-xl transition-all cursor-pointer"
              title="Impostazioni Server & Keys"
            >
              <Server className="w-4 h-4" />
            </button>

            {/* IMAP Settings Button */}
            <button
              onClick={() => setShowImapSettings(true)}
              className="bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 p-2 rounded-xl transition-all cursor-pointer"
              title="Impostazioni IMAP (Lettura Risposte)"
            >
              <Mail className="w-4 h-4 rotate-180" />
            </button>

            {/* Email Campaign Button */}
            <button
              onClick={() => setShowEmailCampaigns(true)}
              className="bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Campagne Email Massive"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Campagne</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-2 rounded-xl transition-all cursor-pointer"
              title="Disconnetti"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>
      </header>

      {/* Main Content & Navigation Tabs */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* Navigation tabs & Global Add Lead */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-200 pb-3">
          
          <div className="flex bg-slate-200/80 p-1 rounded-2xl w-full md:w-auto">
            <button
              onClick={() => { setCurrentTab('leads'); }}
              className={`flex-1 md:flex-none px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                currentTab === 'leads' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="hidden sm:inline">Gestione Lead</span>
              <span className="sm:hidden">Lead</span>
            </button>
            <button
              onClick={() => { setCurrentTab('calendar'); setSelectedLead(null); }}
              className={`flex-1 md:flex-none px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                currentTab === 'calendar' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="hidden sm:inline">Calendario & Appuntamenti</span>
              <span className="sm:hidden">Calendario</span>
            </button>
            <button
              onClick={() => { setCurrentTab('reports'); setSelectedLead(null); }}
              className={`flex-1 md:flex-none px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                currentTab === 'reports' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="hidden sm:inline">Report Attività</span>
              <span className="sm:hidden">Report</span>
            </button>
          </div>

          {currentTab === 'leads' && (
            <div className="grid grid-cols-2 md:flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs sm:text-sm font-bold border border-emerald-200 rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Importa Lead</span>
              </button>
              <button
                onClick={() => { setEditingLead(null); setShowLeadModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2.5 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Nuovo Lead</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab content area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[500px]">
          
          {currentTab === 'reports' ? (
            <div className="flex-1 w-full min-w-0">
              <ReportsView leads={leads} colleagues={colleagueObjects} services={services} />
            </div>
          ) : currentTab === 'leads' ? (
            
            /* Leads Management Layout */
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              
              <TasksWidget visibleColleagues={activeColleagueObj?.visibleColleagues} 
                activeColleague={activeColleague} 
                googleToken={googleToken}
                onLeadSelect={(id) => {
                  const lead = leads.find(l => l.id === id);
                  if (lead) setSelectedLead(lead);
                }} 
              />
              
              <DashboardAlerts 
                activeColleague={activeColleague} 
                onSelectLead={(leadId) => {
                  const lead = leads.find(l => l.id === leadId);
                  if (lead) setSelectedLead(lead);
                }}
              />

              {/* Search & Status Filters */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-3 shadow-xs">
                
                {/* Search */}
                <div className="flex-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    name="lead-search-query"
                    placeholder="Cerca per nome, telefono, azienda o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  {/* Type Filter */}
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1 bg-slate-50 md:max-w-[150px] w-full">
                    <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as 'Tutti' | 'Lead' | 'Cliente')}
                      className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none w-full py-1.5 cursor-pointer"
                    >
                      <option value="Tutti">Tipo (Tutti)</option>
                      <option value="Lead">Lead</option>
                      <option value="Cliente">Cliente</option>
                    </select>
                  </div>

                  {/* Service Filter */}
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1 bg-slate-50 md:max-w-[180px] w-full">
                    <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none w-full py-1.5 cursor-pointer"
                    >
                      <option value="Tutti">Servizio (Tutti)</option>
                      {availableServices.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assigned Colleague / Vendor Filter */}
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1 bg-slate-50 md:max-w-[210px] w-full">
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <select
                      value={colleagueFilter}
                      onChange={(e) => setColleagueFilter(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none w-full py-1.5 cursor-pointer"
                    >
                      <option value="Tutti">Assegnato (Tutti)</option>
                      <option value="__unassigned__">⚠️ Non Assegnati</option>
                      <optgroup label="Telefonisti / Ufficio">
                        {colleagueObjects.filter(c => c.role !== 'venditore').map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Agenti Commerciali">
                        {colleagueObjects.filter(c => c.role === 'venditore').map(c => (
                          <option key={c.id} value={c.name}>💼 {c.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1 bg-slate-50 md:max-w-[190px] w-full">
                    <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none w-full py-1.5 cursor-pointer"
                    >
                      <option value="Tutti">Stato (Tutti)</option>
                      <option value="Nuovo">⚪ Nuovo</option>
                      <option value="Chiamato - Nessuna Risposta">🟡 Nessuna Risposta</option>
                      <option value="Da richiamare">🔵 Da richiamare</option>
                      <option value="Interessato">🟢 Interessato</option>
                      <option value="Non interessato">🔴 Non interessato</option>
                      <option value="Chiuso con successo">🏆 Chiuso con successo</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Leads List / Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex-1">
                {loadingLeads ? (
                  <div className="flex justify-center items-center py-20 text-slate-400 text-sm font-medium">
                    Caricamento del portfolio lead dal database...
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-24 text-slate-400 space-y-3">
                    <Users className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="text-sm">Nessun lead trovato. Prova a modificare la ricerca o i filtri.</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card List (visible on small screens < md) */}
                    <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
                      {filteredLeads.map((lead) => {
                        const isSelected = selectedLead?.id === lead.id;
                        return (
                          <div
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className={`bg-white border rounded-2xl p-4 space-y-3 shadow-xs transition-all cursor-pointer ${
                              isSelected ? 'border-indigo-600 ring-2 ring-indigo-600/15' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h3 className="font-black text-slate-900 text-base">{lead.name}</h3>
                                {lead.company && (
                                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                    <Building className="w-3.5 h-3.5 text-slate-400" />
                                    {lead.company}
                                  </p>
                                )}
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                lead.type === 'Cliente' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {lead.type || 'Lead'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                lead.status?.toLowerCase() === 'nuovo' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                                lead.status?.toLowerCase() === 'chiamato - nessuna risposta' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                lead.status?.toLowerCase() === 'da richiamare' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                lead.status?.toLowerCase() === 'interessato' ? 'bg-green-50 text-green-700 border-green-200 font-black' :
                                lead.status?.toLowerCase() === 'non interessato' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}>
                                {lead.status}
                              </span>

                              {(lead.services?.length ? lead.services.join(', ') : lead.service) && (
                                <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
                                  {lead.services?.length ? lead.services.join(', ') : lead.service}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${lead.phone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg"
                                >
                                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                                  {lead.phone}
                                </a>
                              </div>

                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="text-indigo-600 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                Apri <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View (hidden on mobile < md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70">
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Contatto Lead</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Telefono / Email</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo / Servizio</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Stato</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Assegnato A</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Azioni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLeads.map((lead) => {
                            const isSelected = selectedLead?.id === lead.id;
                            return (
                              <tr 
                                key={lead.id} 
                                onClick={() => setSelectedLead(lead)}
                                className={`group cursor-pointer hover:bg-indigo-50/20 transition-colors border-l-4 ${
                                  isSelected ? 'bg-indigo-50/50 border-l-indigo-600' : 'border-l-transparent'
                                }`}
                              >
                                <td className="px-6 py-4.5">
                                  <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lead.name}</div>
                                  {lead.company && (
                                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                      <Building className="w-3.5 h-3.5 text-slate-400" />
                                      {lead.company}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4.5 text-sm">
                                  <a 
                                    href={`tel:${lead.phone}`} 
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold text-slate-700 hover:text-indigo-600 hover:underline"
                                  >
                                    {lead.phone}
                                  </a>
                                  {lead.email && (
                                    <div className="text-xs mt-0.5">
                                      <a 
                                        href={`mailto:${lead.email}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-slate-400 hover:text-indigo-600 hover:underline"
                                      >
                                        {lead.email}
                                      </a>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4.5">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lead.type === 'Cliente' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {lead.type || 'Lead'}
                                    </span>
                                    {lead.services && lead.services.length > 0 ? (
                                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px]" title={lead.services.join(', ')}>
                                        {lead.services.join(', ')}
                                      </span>
                                    ) : lead.service ? (
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        {lead.service}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-6 py-4.5">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border
                                    ${lead.status?.toLowerCase() === 'nuovo' ? 'bg-slate-50 text-slate-700 border-slate-200' : ''}
                                    ${lead.status?.toLowerCase() === 'chiamato - nessuna risposta' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                                    ${lead.status?.toLowerCase() === 'da richiamare' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                    ${lead.status?.toLowerCase() === 'interessato' ? 'bg-green-50 text-green-700 border-green-200 font-bold' : ''}
                                    ${lead.status?.toLowerCase() === 'non interessato' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                                    ${lead.status?.toLowerCase() === 'chiuso con successo' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : ''}
                                  `}>
                                    {lead.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4.5 text-xs font-semibold text-slate-600">
                                  {lead.assignedColleague || 'Nessuno'}
                                </td>
                                <td className="px-6 py-4.5 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => { setEditingLead(lead); setShowLeadModal(true); }}
                                      className="text-slate-400 hover:text-slate-700 text-xs font-semibold p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                      Modifica
                                    </button>
                                    <button
                                      onClick={() => setSelectedLead(lead)}
                                      className="text-indigo-600 hover:text-indigo-700 text-xs font-bold p-1.5 rounded-lg hover:bg-indigo-100/50 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      Apri
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

            </div>

          ) : (
            
            /* Calendar View Layout */
            <div className="flex-1">
              <AppointmentsList activeColleague={activeColleague} visibleColleagues={activeColleagueObj?.visibleColleagues} 
                googleToken={googleToken}
                leads={leads}
                services={availableServices}
                colleagues={colleagues}
                initialVendorFilter={selectedVendorForCalendar}
                onSelectLead={(id) => {
                  handleSelectLeadById(id);
                  setCurrentTab('leads');
                }}
              />
            </div>

          )}

          {/* Right Detailed Sidebar Drawer */}
          {selectedLead && currentTab === 'leads' && (
            <div className="flex-shrink-0">
              <LeadDetail
                lead={selectedLead}
                activeColleague={activeColleague}
                colleagues={colleagues}
                googleToken={googleToken}
                onClose={() => setSelectedLead(null)}
                onUpdateLead={(updated) => {
                  setSelectedLead(updated);
                  refreshLeads();
                }}
                onDeleteLead={(deletedId) => {
                  setLeads(prev => prev.filter(l => l.id !== deletedId));
                  setSelectedLead(null);
                  refreshLeads();
                }}
                onTriggerGoogleLogin={async () => null}
              />
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 font-medium">
          <p>© 2026 SolarBrand Gestionale • Sistema Ufficio e Venditori Standalone</p>
        </div>
      </footer>

      {/* Add/Edit Lead Modal overlay */}
      {showLeadModal && (
        <LeadModal
          lead={editingLead}
          colleagues={colleagues}
          services={availableServices}
          activeColleague={activeColleague}
          onClose={() => { setShowLeadModal(false); setEditingLead(null); }}
          onSave={() => { 
            setShowLeadModal(false); 
            setEditingLead(null); 
            refreshLeads();
          }}
        />
      )}

      {/* Super Admin Area overlay */}
      {showSuperAdminArea && (
        <SuperAdminArea
          onClose={() => setShowSuperAdminArea(false)}
          onUpdate={() => {
            loadColleagues();
            loadServices();
          }}
          onSelectVendorCalendar={(vendorName) => {
            setSelectedVendorForCalendar(vendorName);
            setCurrentTab('calendar');
          }}
          currentColleagueId={session.id}
        />
      )}

      {/* Import Leads Modal */}
      {showImportModal && (
        <ImportLeadsModal 
          leads={leads}
          services={availableServices}
          colleagues={colleagues}
          activeColleague={activeColleague}
          onClose={() => {
            setShowImportModal(false);
            refreshLeads();
          }}
        />
      )}

      {/* Email Templates Manager overlay */}
      {showEmailTemplateManager && (
        <EmailTemplateManager
          onClose={() => setShowEmailTemplateManager(false)}
          services={availableServices}
        />
      )}
      
      {/* SMS Templates Manager overlay */}
      {showSmsTemplateManager && (
        <SmsTemplateManager
          onClose={() => setShowSmsTemplateManager(false)}
        />
      )}

      {/* SMTP Settings overlay */}
      {showSmtpSettings && (
        <SmtpSettingsManager
          onClose={() => setShowSmtpSettings(false)}
        />
      )}

      {/* IMAP Settings overlay */}
      {showImapSettings && (
        <ImapSettingsManager
          onClose={() => setShowImapSettings(false)}
        />
      )}

      {/* Email Campaign Manager overlay */}
      {showEmailCampaigns && (
        <EmailCampaignManager
          onClose={() => setShowEmailCampaigns(false)}
          currentUser={session.name}
          onOpenLead={(leadId) => {
            setShowEmailCampaigns(false);
            handleSelectLeadById(leadId);
          }}
        />
      )}

    </div>
  );
}
