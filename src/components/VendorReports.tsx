import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Calendar, Zap, CheckCircle, Search, Filter } from 'lucide-react';
import { VisitReport, Lead } from '../types';
import { api } from '../lib/api';

interface Props {
  vendorName: string;
  leads: Lead[];
  onEditReport: (appointmentId: string) => void;
  onViewLead: (leadId: string) => void;
}

export default function VendorReports({ vendorName, leads, onEditReport, onViewLead }: Props) {
  const [reports, setReports] = useState<VisitReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOutcome, setFilterOutcome] = useState('tutti');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReports();
  }, [vendorName]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.getVisitReports(vendorName);
      setReports(data);
    } catch (err) {
      console.error('Error loading visit reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = reports.filter(r => {
    const lead = leads.find(l => l.id === r.leadId);
    const matchesOutcome = filterOutcome === 'tutti' || r.outcome === filterOutcome;
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      r.notes.toLowerCase().includes(searchLower) || 
      r.nextAction?.toLowerCase().includes(searchLower) ||
      (lead && lead.name.toLowerCase().includes(searchLower)) ||
      (lead && lead.company?.toLowerCase().includes(searchLower));
    return matchesOutcome && matchesSearch;
  });

  const totalContractsValue = reports
    .filter(r => r.outcome === 'contratto_firmato')
    .reduce((sum, r) => sum + (r.contractValue || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visite Effettuate</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{reports.length}</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contratti Firmati</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {reports.filter(r => r.outcome === 'contratto_firmato').length}
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valore Totale Firmato</p>
            <p className="text-2xl font-black text-slate-900 mt-1">€ {totalContractsValue.toLocaleString('it-IT')}</p>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cerca nelle note o azioni..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5"
          />
        </div>

        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1 bg-slate-50 min-w-[200px]">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={filterOutcome}
            onChange={e => setFilterOutcome(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-700 w-full py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="tutti">Esito (Tutti)</option>
            <option value="contratto_firmato">🏆 Contratto Firmato</option>
            <option value="interessato">🟢 Interessato</option>
            <option value="sopralluogo_necessario">📐 Sopralluogo</option>
            <option value="da_ricontattare">🟡 Da Richiamare</option>
            <option value="non_interessato">🔴 Non Interessato</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">Caricamento schede...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">Nessuna scheda visita trovata.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(report => {
              const lead = leads.find(l => l.id === report.leadId);
              return (
                <div key={report.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                        report.outcome === 'contratto_firmato' ? 'bg-emerald-100 text-emerald-800' :
                        report.outcome === 'interessato' ? 'bg-blue-100 text-blue-800' :
                        report.outcome === 'non_interessato' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {report.outcome === 'contratto_firmato' ? '🏆 Contratto Firmato' : report.outcome}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(report.visitDate).toLocaleString('it-IT')}
                      </span>
                    </div>

                    {report.contractValue ? (
                      <span className="text-sm font-extrabold text-emerald-600">
                        € {report.contractValue.toLocaleString('it-IT')}
                      </span>
                    ) : null}
                  </div>

                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900">{lead?.name || 'Lead non trovato'}</h4>
                      {lead?.address && <p className="text-[11px] text-slate-500 mt-0.5">{lead.address}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => lead && onViewLead(lead.id)} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
                        Vedi Lead
                      </button>
                      {report.appointmentId && (
                        <button onClick={() => onEditReport(report.appointmentId)} className="text-xs text-amber-600 font-bold hover:underline cursor-pointer">
                          Modifica Report
                        </button>
                      )}
                    </div>
                  </div>

                  {report.notes && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {report.notes}
                    </p>
                  )}

                  {report.nextAction && (
                    <p className="text-[11px] font-semibold text-indigo-600">
                      Prossima azione: {report.nextAction}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
