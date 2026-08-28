import React, { useState, useEffect } from 'react';
import { Users, Lock, LogIn, ShieldAlert, Briefcase, Phone, ArrowRight, Mail } from 'lucide-react';
import { auth } from '../lib/auth';
import { api } from '../lib/api';
import { Session } from '../types';

interface Props {
  onLogin: (session: Session) => void;
}

interface DemoColleague {
  id: string;
  name: string;
  role: string;
}

export default function LoginScreen({ onLogin }: Props) {
  const [demoMode, setDemoMode] = useState<boolean | null>(null);
  const [demoColleagues, setDemoColleagues] = useState<DemoColleague[]>([]);
  const [loginMode, setLoginMode] = useState<'venditore' | 'ufficio'>('venditore');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getConfig()
      .then(cfg => {
        setDemoMode(cfg.demoMode);
        if (cfg.demoMode) {
          api.getDemoColleagues().then(setDemoColleagues).catch(console.error);
        }
      })
      .catch(() => setDemoMode(false));
  }, []);

  const handleDemoAccess = async (col: DemoColleague) => {
    setError('');
    setLoading(true);
    const session = await auth.demoLogin(col.id);
    setLoading(false);
    if (session) onLogin(session);
    else setError('Accesso rapido non disponibile');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Inserisci email e password');
      return;
    }
    setError('');
    setLoading(true);
    const session = await auth.login(email.trim(), password);
    setLoading(false);
    if (session) {
      onLogin(session);
    } else {
      setError('Credenziali non valide');
    }
  };

  const demoVendors = demoColleagues.filter(c => c.role === 'venditore');
  const demoOfficeStaff = demoColleagues.filter(c => c.role !== 'venditore');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Background Lighting Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/20 relative z-10 space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-gradient-to-br from-amber-500 to-indigo-600 text-white p-3.5 rounded-2xl shadow-xl mb-1">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SolarBrand Gestionale Lead</h1>
          <p className="text-xs font-semibold text-slate-500">Accedi con le tue credenziali</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Real email/password login — always available */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="es. mario.rossi@solarbrand.it"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-2xl pl-10 pr-4 py-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-2xl pl-10 pr-4 py-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <LogIn className="w-5 h-5" />
            <span>Accedi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo quick-access — only rendered while DEMO_MODE=true on the server.
            Disable it in production by setting DEMO_MODE=false in .env. */}
        {demoMode && demoColleagues.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider text-center">
              Modalità demo — accesso rapido senza password
            </p>

            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setLoginMode('venditore')}
                className={`p-3 rounded-xl font-extrabold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer border ${
                  loginMode === 'venditore'
                    ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-white/60 text-slate-600 border-transparent hover:bg-white'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                <span>AREA AGENTI</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('ufficio')}
                className={`p-3 rounded-xl font-extrabold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer border ${
                  loginMode === 'ufficio'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-white/60 text-slate-600 border-transparent hover:bg-white'
                }`}
              >
                <Phone className="w-5 h-5" />
                <span>AREA UFFICIO</span>
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {(loginMode === 'venditore' ? demoVendors : demoOfficeStaff).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleDemoAccess(c)}
                  disabled={loading}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    c.role === 'venditore'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {c.role === 'venditore' ? '💼 ' : '📞 '}{c.name}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
