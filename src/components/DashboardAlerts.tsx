import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Appointment } from '../types';
import { Calendar, Clock, User, AlertCircle } from 'lucide-react';

interface DashboardAlertsProps {
  activeColleague: string;
  onSelectLead: (leadId: string) => void;
}

const AppointmentCard: React.FC<{ appt: Appointment, isMine: boolean, isToday: boolean, onSelect: () => void }> = ({ appt, isMine, isToday, onSelect }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const isVisit = appt.appointmentType !== 'call' && (!appt.title || !appt.title.toLowerCase().includes('richiamo'));

  return (
    <div 
      onClick={onSelect}
      className={`p-4 rounded-xl border flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all h-full ${
        isVisit ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300' : isMine ? 'bg-indigo-50 border-indigo-200 hover:border-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
            isVisit ? 'bg-amber-200 text-amber-900' : 'bg-indigo-200 text-indigo-900'
          }`}>
            {isVisit ? '🏠 Sopralluogo' : '📞 Richiamo'}
          </span>
          <span className={`flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isToday ? (isMine ? 'bg-rose-100 text-rose-700' : 'bg-rose-50 text-rose-600') : (isMine ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700')}`}>
            {isToday ? 'Oggi' : 'Domani'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-600 font-bold text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {formatTime(appt.dateTime)}
        </div>
      </div>

      <div>
        <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">{appt.leadName}</h4>
        <p className="text-xs text-slate-500 line-clamp-1 font-medium mt-0.5">{appt.title || (isVisit ? 'Sopralluogo tecnico' : 'Richiamo telefonico')}</p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3 text-slate-400" />
          Fissato da: {appt.colleague || 'Ufficio'}
        </span>
        {isVisit && appt.assignedVendor && (
          <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
            Agente: {appt.assignedVendor}
          </span>
        )}
      </div>
    </div>
  );
};

export default function DashboardAlerts({ activeColleague, onSelectLead }: DashboardAlertsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const fetchAppts = async () => {
      try {
        const items = await api.getAppointments();
        setAppointments(items);
      } catch (e) {
        console.error('Error fetching dashboard alerts:', e);
      }
    };
    fetchAppts();
    const interval = setInterval(fetchAppts, 30_000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const todayAppts = appointments.filter(a => {
    if (!a.dateTime) return false;
    const dStr = new Date(a.dateTime).toISOString().split('T')[0];
    return dStr === todayStr && a.completed !== 'true' && a.completed !== true;
  });

  const tomorrowAppts = appointments.filter(a => {
    if (!a.dateTime) return false;
    const dStr = new Date(a.dateTime).toISOString().split('T')[0];
    return dStr === tomorrowStr && a.completed !== 'true' && a.completed !== true;
  });

  if (todayAppts.length === 0 && tomorrowAppts.length === 0) return null;

  return (
    <div className="space-y-3">
      {todayAppts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            Appuntamenti di Oggi ({todayAppts.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayAppts.map(appt => (
              <AppointmentCard 
                key={appt.id} 
                appt={appt} 
                isMine={appt.colleague === activeColleague} 
                isToday={true} 
                onSelect={() => onSelectLead(appt.leadId)}
              />
            ))}
          </div>
        </div>
      )}

      {tomorrowAppts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            Appuntamenti di Domani ({tomorrowAppts.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tomorrowAppts.map(appt => (
              <AppointmentCard 
                key={appt.id} 
                appt={appt} 
                isMine={appt.colleague === activeColleague} 
                isToday={false} 
                onSelect={() => onSelectLead(appt.leadId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
