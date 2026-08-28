import React, { useState } from 'react';
import { api } from '../lib/api';
import { Lead } from '../types';
import { Check, Calendar } from 'lucide-react';

interface TaskFormProps {
  lead: Lead;
  colleagues: string[];
  activeColleague: string;
  googleToken: string | null;
}

export default function TaskForm({ lead, colleagues, activeColleague }: TaskFormProps) {
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(activeColleague || '');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return alert('Inserisci la descrizione del promemoria');
    setSaving(true);
    setSuccess(false);
    try {
      await api.createTask({
        leadId: lead.id,
        leadName: lead.name,
        createdBy: activeColleague,
        assignedTo: assignedTo || activeColleague,
        description: description.trim(),
        dueDate,
      });

      setDescription('');
      setDueDate('');
      setSuccess(true);
    } catch (e: any) {
      alert('Errore creazione task: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Crea Promemoria Attività (Task)</span>

      <div>
        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cosa c'è da fare? *</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="es. Elaborare preventivo custom, verificare allaccio enel..."
          className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800 focus:bg-white focus:outline-none"
        />
      </div>

      {colleagues && colleagues.length > 1 && (
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Assegna A</label>
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl p-2.5 text-slate-800 cursor-pointer"
          >
            {colleagues.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Data Scadenza Promemoria</label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl p-2.5 text-slate-800"
        />
      </div>

      {success && (
        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Promemoria registrato con successo!
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Check className="w-3.5 h-3.5" />
        {saving ? 'Salvataggio...' : 'Registra Task'}
      </button>
    </div>
  );
}
