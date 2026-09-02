const BASE = '';

// Some components call fetch() directly instead of going through `request()`
// below (e.g. to stream/parse responses themselves). They still need the
// session token attached, since every /api/* route now requires it.
export function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('solarbrand_token');
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const token = sessionStorage.getItem('solarbrand_token');
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Errore API');
  }
  return res.json();
}

type LoginResult = { ok: boolean, token?: string, id?: string, name?: string, role?: 'telefonista'|'venditore'|'admin', error?: string };

export const api = {
  getConfig: () => request<{ demoMode: boolean, googleCalendarConfigured: boolean }>('GET', '/api/config'),
  login: (email: string, password: string) => request<LoginResult>('POST', '/api/auth/login', { email, password }),
  getDemoColleagues: () => request<{ id: string, name: string, role: string }[]>('GET', '/api/auth/demo-colleagues'),
  demoLogin: (id: string) => request<LoginResult>('POST', '/api/auth/demo-login', { id }),
  logoutSession: (token: string) => request<{ok: boolean}>('POST', '/api/auth/logout', { token }),
  setPassword: (id: string, password: string) => request<{ok: boolean}>('POST', '/api/auth/set-password', { id, password }),
  checkPassword: (password: string, level: 'admin' | 'operator') => request<{ok: boolean}>('POST', '/api/auth/check-password', { password, level }),
  disconnectGoogleCalendar: (vendorId: string) => request<{ok: boolean}>('POST', '/api/auth/google/disconnect', { vendorId }),

  getLeads: (vendorName?: string, telefonistName?: string) => {
    const params = new URLSearchParams();
    if (vendorName) params.set('vendorName', vendorName);
    if (telefonistName) params.set('telefonistName', telefonistName);
    const qs = params.toString();
    return request<any[]>('GET', `/api/leads${qs ? `?${qs}` : ''}`);
  },
  createLead: (data: any) => request<any>('POST', '/api/leads', data),
  updateLead: (id: string, data: any) => request<any>('PUT', `/api/leads/${id}`, data),
  deleteLead: (id: string) => request<any>('DELETE', `/api/leads/${id}`),

  getHistory: (leadId: string) => request<any[]>('GET', `/api/leads/${leadId}/history`),
  getAllHistory: () => request<any[]>('GET', '/api/history'),
  addHistory: (leadId: string, data: any) => request<any>('POST', `/api/leads/${leadId}/history`, data),
  deleteHistory: (leadId: string, histId: string) => request<any>('DELETE', `/api/leads/${leadId}/history/${histId}`),

  getColleagues: () => request<any[]>('GET', '/api/colleagues'),
  createColleague: (data: any) => request<any>('POST', '/api/colleagues', data),
  updateColleague: (id: string, data: any) => request<any>('PUT', `/api/colleagues/${id}`, data),
  deleteColleague: (id: string) => request<any>('DELETE', `/api/colleagues/${id}`),

  getServices: () => request<any[]>('GET', '/api/services'),
  createService: (data: any) => request<any>('POST', '/api/services', data),
  updateService: (id: string, data: any) => request<any>('PUT', `/api/services/${id}`, data),
  deleteService: (id: string) => request<any>('DELETE', `/api/services/${id}`),

  getAppointments: (vendorName?: string) => request<any[]>('GET', `/api/appointments${vendorName ? `?vendorName=${encodeURIComponent(vendorName)}` : ''}`),
  createAppointment: (data: any) => request<any>('POST', '/api/appointments', data),
  updateAppointment: (id: string, data: any) => request<any>('PUT', `/api/appointments/${id}`, data),
  deleteAppointment: (id: string) => request<any>('DELETE', `/api/appointments/${id}`),

  getVisitReports: (vendorName?: string, leadId?: string) => {
    const params = new URLSearchParams();
    if (vendorName) params.append('vendorName', vendorName);
    if (leadId) params.append('leadId', leadId);
    const query = params.toString();
    return request<any[]>('GET', `/api/visit-reports${query ? `?${query}` : ''}`);
  },
  createVisitReport: (data: any) => request<any>('POST', '/api/visit-reports', data),
  updateVisitReport: (id: string, data: any) => request<any>('PUT', `/api/visit-reports/${id}`, data),

  getTasks: (completed?: string) => request<any[]>('GET', `/api/tasks${completed !== undefined ? `?completed=${completed}` : ''}`),
  createTask: (data: any) => request<any>('POST', '/api/tasks', data),
  updateTask: (id: string, data: any) => request<any>('PUT', `/api/tasks/${id}`, data),
  deleteTask: (id: string) => request<any>('DELETE', `/api/tasks/${id}`),

  getEmailTemplates: () => request<any[]>('GET', '/api/email-templates'),
  createEmailTemplate: (data: any) => request<any>('POST', '/api/email-templates', data),
  updateEmailTemplate: (id: string, data: any) => request<any>('PUT', `/api/email-templates/${id}`, data),
  deleteEmailTemplate: (id: string) => request<any>('DELETE', `/api/email-templates/${id}`),

  getSmsTemplates: () => request<any[]>('GET', '/api/sms-templates'),
  createSmsTemplate: (data: any) => request<any>('POST', '/api/sms-templates', data),
  updateSmsTemplate: (id: string, data: any) => request<any>('PUT', `/api/sms-templates/${id}`, data),
  deleteSmsTemplate: (id: string) => request<any>('DELETE', `/api/sms-templates/${id}`),

  getSmtpAccounts: () => request<any[]>('GET', '/api/smtp-accounts'),
  createSmtpAccount: (data: any) => request<any>('POST', '/api/smtp-accounts', data),
  updateSmtpAccount: (id: string, data: any) => request<any>('PUT', `/api/smtp-accounts/${id}`, data),
  deleteSmtpAccount: (id: string) => request<any>('DELETE', `/api/smtp-accounts/${id}`),

  getSettings: () => request<Record<string, string>>('GET', '/api/settings'),
  setSetting: (key: string, value: string) => request<any>('POST', '/api/settings', { key, value }),

  importLeads: (leads: any[], duplicate_mode: string) => request<any>('POST', '/api/leads/import', { leads, duplicate_mode }),
  startApifySearch: (data: { 
    industries: string; 
    locations: string; 
    fetch_count: number; 
    keywords?: string; 
    cities?: string;
    assignedColleague?: string;
    assignedTelefonista?: string;
    service?: string;
  }) =>
    request<{ ok: boolean; runId: string; status: string }>('POST', '/api/leads/apify-search', data),
  getApifySearchStatus: (runId: string) =>
    request<{
      status: 'RUNNING' | 'DONE' | 'FAILED';
      ok?: boolean;
      imported?: number;
      total?: number;
      importedIds?: string[];
      foundSoFar?: number;
      roundsDone?: number;
      message?: string;
      error?: string;
    }>('GET', `/api/leads/apify-search/status?runId=${encodeURIComponent(runId)}`),
  sendEmail: (data: any) => request<any>('POST', '/api/send-email', data),

  getLeadAttachments: (leadId: string) => request<any[]>('GET', `/api/leads/${leadId}/attachments`),
  uploadLeadAttachment: (leadId: string, data: { description: string, fileName: string, fileSize?: number, mimeType?: string, uploadedBy: string, fileData: string }) => request<any>('POST', `/api/leads/${leadId}/attachments`, data),
  deleteLeadAttachment: (id: string) => request<any>('DELETE', `/api/attachments/${id}`),

  // Email Campaigns
  getEmailCampaigns: () => request<any[]>('GET', '/api/email-campaigns'),
  createEmailCampaign: (data: any) => request<any>('POST', '/api/email-campaigns', data),
  deleteEmailCampaign: (id: string) => request<any>('DELETE', `/api/email-campaigns/${id}`),
  getCampaignRecipients: (campaignId: string) => request<any[]>('GET', `/api/email-campaigns/${campaignId}/recipients`),
  addCampaignRecipients: (campaignId: string, leadIds: string[]) => request<any>('POST', `/api/email-campaigns/${campaignId}/recipients`, { leadIds }),
  sendEmailCampaign: (campaignId: string) => request<any>('POST', `/api/email-campaigns/${campaignId}/send`),
  pauseEmailCampaign: (campaignId: string) => request<any>('POST', `/api/email-campaigns/${campaignId}/pause`),

  // IMAP Accounts
  getImapAccounts: () => request<any[]>('GET', '/api/imap-accounts'),
  createImapAccount: (data: any) => request<any>('POST', '/api/imap-accounts', data),
  updateImapAccount: (id: string, data: any) => request<any>('PUT', `/api/imap-accounts/${id}`, data),
  deleteImapAccount: (id: string) => request<any>('DELETE', `/api/imap-accounts/${id}`),
  checkImapAccount: (id: string) => request<any>('POST', `/api/imap-accounts/${id}/check`),

  // Reviews
  getAdminReviews: () => request<any[]>('GET', '/api/admin/reviews'),
  deleteAdminReview: (id: string) => request<any>('DELETE', `/api/admin/reviews/${id}`),
  clearAllReviews: () => request<any>('DELETE', '/api/admin/reviews'),
};

