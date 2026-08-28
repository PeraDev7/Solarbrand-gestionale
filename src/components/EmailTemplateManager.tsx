import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Plus, Trash2, Mail, Check, Edit2 } from 'lucide-react';

interface EmailTemplateManagerProps {
  onClose: () => void;
  services: string[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  templateType?: 'post_visit' | 'review_request' | 'custom';
  createdAt: string;
}

export default function EmailTemplateManager({ onClose, services }: EmailTemplateManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getEmailTemplates();
      setTemplates(data);
    } catch (e) {
      console.error('Error fetching email templates:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tpl: EmailTemplate) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const handleReset = () => {
    setEditingId(null);
    setName('');
    setSubject('');
    setBody('');
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      return alert('Tutti i campi sono obbligatori');
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateEmailTemplate(editingId, { name, subject, body });
      } else {
        await api.createEmailTemplate({ name, subject, body });
      }
      handleReset();
      fetchTemplates();
    } catch (e: any) {
      alert('Errore: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpl: EmailTemplate) => {
    if (tpl.templateType === 'post_visit' || tpl.templateType === 'review_request') {
      return alert('Questo è un template di sistema e non può essere eliminato. Puoi modificarne l\'oggetto ed il contenuto.');
    }
    if (!confirm('Eliminare questo template?')) return;
    try {
      await api.deleteEmailTemplate(tpl.id);
      if (editingId === tpl.id) handleReset();
      fetchTemplates();
    } catch (e: any) {
      alert('Errore: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Template Email & Automatismi</h2>
              <p className="text-sm text-slate-500">Gestisci i modelli di email aziendali e quelli automatici di sistema</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Template List */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-slate-700">Template Salvati ({templates.length})</h3>
            {loading ? (
              <p className="text-sm text-slate-400">Caricamento...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nessun template email presente.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {templates.map(tpl => {
                  const isSystem = tpl.templateType === 'post_visit' || tpl.templateType === 'review_request';
                  return (
                    <div key={tpl.id} className={`border rounded-2xl p-4 flex flex-col justify-between gap-2 ${
                      isSystem ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900 text-sm">{tpl.name}</h4>
                          {isSystem && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                              🔒 Automazione Sistema
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-indigo-600 font-semibold mt-0.5">Oggetto: {tpl.subject}</p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{tpl.body.replace(/<[^>]*>?/gm, '')}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                        <button
                          onClick={() => handleEdit(tpl)}
                          className="text-xs font-bold text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-white flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Modifica
                        </button>
                        {!isSystem && (
                          <button
                            onClick={() => handleDelete(tpl)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Elimina
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Editor Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-slate-700">
              {editingId ? 'Modifica Template' : 'Nuovo Template'}
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome Identificativo *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="es. Primo Contatto commerciale"
                className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Oggetto Email *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="es. Proposta commerciale per {azienda}"
                className="w-full bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Corpo del Messaggio (HTML supportato) *</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={6}
                placeholder="Gentile {nome}, in merito al servizio {servizio}..."
                className="w-full bg-white border border-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div className="bg-slate-100 p-3 rounded-xl space-y-1">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tag dinamici disponibili:</p>
              <p className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-1.5">
                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{"{nome}"}</code>
                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{"{azienda}"}</code>
                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{"{agente}"}</code>
                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{"{servizio}"}</code>
                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{"{link_recensione}"}</code>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl"
                >
                  Annulla
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Salvataggio...' : 'Salva Template'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
