export interface Lead {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  status: 'Nuovo' | 'Chiamato - Nessuna Risposta' | 'Da richiamare' | 'Interessato' | 'Non interessato' | 'Chiuso con successo';
  type: 'Lead' | 'Cliente';
  service?: string;
  services?: string[];
  assignedColleague?: string;    // agente commerciale (venditore) — singolo
  assignedTelefonisti?: string[]; // telefonisti assegnati — multipli
  notes?: string;
  address?: string;
  source?: string;
  quoteStatus?: 'nessuno' | 'bozza' | 'consegnato';
  quoteDeliveryMethod?: 'whatsapp' | 'cartaceo' | 'email';
  quoteFileName?: string;
  quoteDeliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  id: string;
  leadId?: string;
  timestamp: string;
  colleague: string;
  note: string;
  statusAfterCall: string;
  type: 'call' | 'note' | 'status_change' | 'appointment' | 'email' | 'visit_report' | 'quote';
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface SmtpAccount {
  id: string;
  name: string;
  host: string;
  port: string;
  user: string;
  pass: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 content
  contentType?: string;
  size?: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  templateType?: 'post_visit' | 'review_request' | 'custom';
  attachments?: EmailAttachment[] | string;
  createdAt?: string;
}

export interface Colleague {
  id: string;
  name: string;
  role?: 'telefonista' | 'venditore' | 'admin';
  username?: string;
  passwordSet?: boolean;
  googleCalendarConnected?: boolean;
  services?: string[];
  visibleColleagues?: string[];
  phone?: string;
  email?: string;
  avgRating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface Review {
  id: string;
  leadId?: string;
  vendorName: string;
  rating: number;
  comment?: string;
  token: string;
  usedAt?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  leadId: string;
  leadName: string;
  colleague: string; // Chi ha fissato (Erika/Telefonista)
  assignedVendor: string; // Agente assegnato (es. Mario Rossi)
  dateTime: string;
  title: string;
  notes?: string;
  appointmentType?: 'call' | 'visit';
  googleEventId?: string;
  vendorGoogleEventId?: string;
  visitStatus?: 'pending' | 'completed' | 'not_done';
  visitCompletedAt?: string;
  completed?: boolean | string;
  createdAt?: string;
}

export interface VisitReport {
  id: string;
  appointmentId: string;
  leadId: string;
  vendorName: string;
  visitDate: string;
  visitStatus: 'effettuato' | 'non_effettuato';
  clientType: 'residenziale' | 'azienda';
  kwpSystem: number;
  hasHeatPump: boolean;
  outcome: 'contratto_firmato' | 'trattativa_in_corso' | 'interessato' | 'non_interessato' | 'da_ricontattare';
  contractValue?: number;
  notes: string;
  nextAction?: string;
  roofType?: string;
  consumption?: number;
  photos?: string[];
  quoteStatus?: 'nessuno' | 'bozza' | 'consegnato';
  quoteDeliveryMethod?: 'whatsapp' | 'cartaceo' | 'email';
  quoteFileName?: string;
  quoteFileData?: string;
  quoteDeliveredAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  leadId: string;
  leadName: string;
  createdBy: string;
  assignedTo: string;
  description: string;
  dueDate: string;
  completed: boolean | string;
  createdAt: string;
  googleEventId?: string;
  appointmentId?: string;
}

export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
}

export interface Session {
  id: string;
  name: string;
  role: 'telefonista' | 'venditore' | 'admin';
}

export interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  smtpId: string;
  status: 'draft' | 'sending' | 'sent' | 'paused';
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  sendDelay: number;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
}

export interface EmailCampaignRecipient {
  id: string;
  campaignId: string;
  leadId: string;
  email: string;
  leadName: string;
  status: 'pending' | 'sent' | 'failed';
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  replyText?: string;
  messageId?: string;
  sentAt?: string;
  errorMsg?: string;
  // calculated
  temperature?: number;
}

export interface ImapAccount {
  id: string;
  name: string;
  host: string;
  port: string;
  user_email: string;
  pass: string;
  useSSL: boolean;
  lastChecked?: string;
  createdAt: string;
}

export interface LeadAttachment {
  id: string;
  leadId: string;
  description: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}
