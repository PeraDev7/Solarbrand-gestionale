import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Task } from '../types';
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';

interface TasksWidgetProps {
  activeColleague: string;
  visibleColleagues?: string[];
  googleToken: string | null;
  onLeadSelect?: (leadId: string) => void;
}

export default function TasksWidget({ activeColleague, visibleColleagues, googleToken, onLeadSelect }: TasksWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchTasks = async () => {
    if (!activeColleague) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const items = await api.getTasks('false');
      setTasks(items);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30_000);
    return () => clearInterval(interval);
  }, [activeColleague]);

  const handleToggleComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateTask(task.id, { completed: String(!task.completed) });
      fetchTasks();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteTask(taskId);
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const isMine = task.assignedTo === activeColleague;
    if (visibleColleagues === undefined) return true;
    return isMine || visibleColleagues.includes(task.assignedTo);
  });

  if (loading || filteredTasks.length === 0) return null;

  return (
    <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">
            Task & Reminder In Scadenza ({filteredTasks.length})
          </h3>
        </div>
        <button className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {filteredTasks.map(task => {
            const isOverdue = new Date(task.dueDate) < new Date();
            return (
              <div 
                key={task.id}
                onClick={() => onLeadSelect?.(task.leadId)}
                className="bg-white border border-amber-200/60 rounded-xl p-3 flex items-center justify-between hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => handleToggleComplete(task, e)}
                    className="text-slate-300 hover:text-emerald-500 transition-colors"
                  >
                    <Circle className="w-5 h-5" />
                  </button>
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{task.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-bold text-indigo-600">{task.leadName}</span>
                      <span>• Assegnato a: <strong>{task.assignedTo}</strong></span>
                      {task.dueDate && (
                        <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                          • Entro: {new Date(task.dueDate).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={(e) => handleDeleteTask(task.id, e)}
                  className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
