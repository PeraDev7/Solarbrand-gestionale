import { Session } from '../types';
import { api } from './api';

let cachedGoogleToken: string | null = localStorage.getItem('google_access_token');

function storeSession(res: { ok: boolean, token?: string, id?: string, name?: string, role?: 'telefonista'|'venditore'|'admin' }): Session | null {
  if (!res.ok || !res.name || !res.role || !res.id || !res.token) return null;
  const session: Session = { id: res.id, name: res.name, role: res.role };
  sessionStorage.setItem('solarbrand_session', JSON.stringify(session));
  sessionStorage.setItem('solarbrand_token', res.token);
  return session;
}

export const auth = {
  async login(email: string, password: string): Promise<Session | null> {
    try {
      return storeSession(await api.login(email, password));
    } catch {
      return null;
    }
  },

  async demoLogin(id: string): Promise<Session | null> {
    try {
      return storeSession(await api.demoLogin(id));
    } catch {
      return null;
    }
  },

  getSession(): Session | null {
    try {
      const raw = sessionStorage.getItem('solarbrand_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return sessionStorage.getItem('solarbrand_token');
  },

  logout() {
    const token = sessionStorage.getItem('solarbrand_token');
    sessionStorage.removeItem('solarbrand_session');
    sessionStorage.removeItem('solarbrand_token');
    if (token) api.logoutSession(token).catch(() => {});
  }
};

export const localAuth = {
  checkAdminPassword: async (password: string): Promise<boolean> => {
    try {
      const res = await api.checkPassword(password, 'admin');
      return res.ok === true;
    } catch {
      return false;
    }
  },

  checkOperatorPassword: async (password: string): Promise<boolean> => {
    try {
      const res = await api.checkPassword(password, 'operator');
      return res.ok === true;
    } catch {
      return false;
    }
  },
};

export const googleCalendar = {
  getToken: () => cachedGoogleToken,
  setToken: (token: string | null) => {
    cachedGoogleToken = token;
    if (token) localStorage.setItem('google_access_token', token);
    else localStorage.removeItem('google_access_token');
  },
};
