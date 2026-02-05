import { google, calendar_v3 } from 'googleapis';
import fs from 'fs';
import { OAuth2Client } from 'google-auth-library';
import { config } from './config';
import logger from './logger';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO string
  end: string; // ISO string
  date: string; // YYYY-MM-DD format
}

class CalendarService {
  private auth: OAuth2Client | null = null;
  private calendar: calendar_v3.Calendar | null = null;

  async initialize(): Promise<void> {
    try {
      this.auth = await this.authorize();
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      logger.info('Google Calendar API initialized successfully');
    } catch (error) {
      logger.error('Error initializing Google Calendar API', { error });
      throw error;
    }
  }

  // Helper method to check if error is an OAuth invalid_grant error
  private isInvalidGrantError(error: any): boolean {
    const errorString = JSON.stringify(error).toLowerCase();
    return (
      errorString.includes('invalid_grant') ||
      error?.response?.data?.error === 'invalid_grant' ||
      error?.message?.includes('invalid_grant') ||
      error?.code === 401
    );
  }

  private async authorize(): Promise<OAuth2Client> {
    // Load client secrets from credentials.json
    const credentials = JSON.parse(fs.readFileSync(config.credentialsPath, 'utf-8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token
    if (fs.existsSync(config.tokenPath)) {
      const token = JSON.parse(fs.readFileSync(config.tokenPath, 'utf-8'));
      oAuth2Client.setCredentials(token);

      // Listen for token refresh events and save the new token
      oAuth2Client.on('tokens', (tokens) => {
        logger.info('OAuth token refreshed, saving to disk', { tokenPath: config.tokenPath });

        // If we only get an access_token, preserve the refresh_token from the existing token
        if (tokens.refresh_token) {
          fs.writeFileSync(config.tokenPath, JSON.stringify(tokens, null, 2));
        } else {
          // Merge with existing token to preserve refresh_token
          const existingToken = JSON.parse(fs.readFileSync(config.tokenPath, 'utf-8'));
          const updatedToken = { ...existingToken, ...tokens };
          fs.writeFileSync(config.tokenPath, JSON.stringify(updatedToken, null, 2));
        }

        logger.info('Token saved successfully', { tokenPath: config.tokenPath });
      });

      return oAuth2Client;
    } else {
      throw new Error(
        'No token.json found. Please run the authentication flow first using npm run auth'
      );
    }
  }

  private async getCalendarId(): Promise<string> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized');
    }

    try {
      const res = await this.calendar.calendarList.list();
      const calendars = res.data.items || [];

      const targetCalendar = calendars.find(cal => cal.summary === config.calendarName);

      if (!targetCalendar || !targetCalendar.id) {
        throw new Error(`Calendar "${config.calendarName}" not found`);
      }

      return targetCalendar.id;
    } catch (error: any) {
      // Check if this is an OAuth error
      if (this.isInvalidGrantError(error)) {
        throw new Error('invalid_grant: Your OAuth token has expired or been revoked. Please re-authenticate by running: npm run auth');
      }
      logger.error('Error fetching calendar list', { error, calendarName: config.calendarName });
      throw error;
    }
  }

  async getRecentEvents(hoursBack: number = 24): Promise<CalendarEvent[]> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized');
    }

    try {
      const calendarId = await this.getCalendarId();
      const now = new Date();
      const timeMin = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

      const res = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = res.data.items || [];
      return events.map(event => this.parseEvent(event)).filter(e => e !== null) as CalendarEvent[];
    } catch (error: any) {
      // Check if this is an OAuth error
      if (this.isInvalidGrantError(error)) {
        throw new Error('invalid_grant: Your OAuth token has expired or been revoked. Please re-authenticate by running: npm run auth');
      }
      logger.error('Error fetching calendar events', { error, hoursBack });
      throw error;
    }
  }

  async getUpcomingEvents(daysAhead: number = 30): Promise<CalendarEvent[]> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized');
    }

    try {
      const calendarId = await this.getCalendarId();
      const now = new Date();
      const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const res = await this.calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = res.data.items || [];
      return events.map(event => this.parseEvent(event)).filter(e => e !== null) as CalendarEvent[];
    } catch (error: any) {
      // Check if this is an OAuth error
      if (this.isInvalidGrantError(error)) {
        throw new Error('invalid_grant: Your OAuth token has expired or been revoked. Please re-authenticate by running: npm run auth');
      }
      logger.error('Error fetching upcoming calendar events', { error, daysAhead });
      throw error;
    }
  }

  private parseEvent(event: calendar_v3.Schema$Event): CalendarEvent | null {
    if (!event.id || !event.summary) {
      return null;
    }

    // Handle both dateTime and date (all-day events)
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;

    if (!start || !end) {
      return null;
    }

    // Extract date in YYYY-MM-DD format
    const date = start.split('T')[0];

    return {
      id: event.id,
      summary: event.summary,
      description: event.description ?? undefined,
      start,
      end,
      date,
    };
  }

  formatEventForNotification(event: CalendarEvent): string {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    // Format date and time
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const startTimeStr = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const endTimeStr = endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calculate duration
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    let message = `📅 *New Axtra Event*\n\n`;
    message += `*${event.summary}*\n\n`;
    message += `📆 ${dateStr}\n`;
    message += `🕐 ${startTimeStr} - ${endTimeStr}\n`;
    message += `⏱ Duration: ${durationHours}h ${durationMinutes}m\n`;

    if (event.description) {
      message += `\n📝 ${event.description}`;
    }

    return message;
  }

  // Get unique dates from events for auto-detecting working days
  getEventDates(events: CalendarEvent[]): string[] {
    return [...new Set(events.map(event => event.date))].sort();
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
