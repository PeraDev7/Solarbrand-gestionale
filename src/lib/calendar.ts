import { google } from 'googleapis';
import { db } from './database.js';

export function getOAuthClient() {
  const port = Number(process.env.PORT) || 3000;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/google/callback`
  );
}

export async function syncAppointmentToVendorCalendar(appointment: any): Promise<void> {
  if (!appointment?.assignedVendor) return;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return;

  const vendor = await db.get('SELECT * FROM colleagues WHERE name = ? AND role = ?', [appointment.assignedVendor, 'venditore']) as any;
  if (!vendor?.googleTokens) return;

  try {
    const tokens = JSON.parse(vendor.googleTokens);
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(tokens);
    oauth2Client.on('tokens', async (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      await db.run('UPDATE colleagues SET googleTokens = ? WHERE id = ?', [JSON.stringify(merged), vendor.id]);
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [appointment.leadId]) as any;

    const startDate = new Date(appointment.dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60000);
    const descriptionLines = [
      appointment.notes || '',
      lead?.phone ? `Telefono cliente: ${lead.phone}` : '',
      lead?.address ? `Indirizzo: ${lead.address}` : '',
      appointment.colleague ? `Appuntamento fissato da: ${appointment.colleague}` : '',
    ].filter(Boolean);

    const eventBody = {
      summary: appointment.title || `Appuntamento - ${appointment.leadName || 'Cliente'}`,
      description: descriptionLines.join('\n'),
      location: lead?.address || '',
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
    };

    if (appointment.vendorGoogleEventId) {
      await calendar.events.update({ calendarId: 'primary', eventId: appointment.vendorGoogleEventId, requestBody: eventBody });
    } else {
      const created = await calendar.events.insert({ calendarId: 'primary', requestBody: eventBody });
      await db.run('UPDATE appointments SET vendorGoogleEventId = ? WHERE id = ?', [created.data.id, appointment.id]);
    }
  } catch (e) {
    console.error(`[google-calendar-sync] Errore sincronizzazione per l'agente ${appointment.assignedVendor}:`, e);
  }
}

export async function deleteVendorCalendarEvent(appointment: any): Promise<void> {
  if (!appointment?.vendorGoogleEventId || !appointment?.assignedVendor) return;
  const vendor = await db.get('SELECT * FROM colleagues WHERE name = ?', [appointment.assignedVendor]) as any;
  if (!vendor?.googleTokens) return;

  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(JSON.parse(vendor.googleTokens));
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.delete({ calendarId: 'primary', eventId: appointment.vendorGoogleEventId });
  } catch (e) {
    console.error('[google-calendar-sync] Errore eliminazione evento dal calendario agente:', e);
  }
}

