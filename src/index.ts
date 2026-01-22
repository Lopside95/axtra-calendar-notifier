import express from 'express';
import { config } from './config';
import { calendarService } from './calendar';
import { telegramService } from './telegram';
import { storage } from './storage';

class CalendarNotifier {
  private lastCheckTime: Date | null = null;
  private isRunning: boolean = false;

  async start(): Promise<void> {
    console.log('🚀 Starting Axtra Calendar Notifier...\n');

    try {
      // Initialize Google Calendar API
      console.log('📅 Initializing Google Calendar API...');
      await calendarService.initialize();

      // Enable Telegram bot polling for commands
      console.log('🤖 Starting Telegram bot...');
      telegramService.enablePolling();

      // Send startup notification
      await telegramService.sendMessage(
        '✅ *Axtra Calendar Notifier Started*\n\n' +
        `📅 Monitoring: ${config.calendarName}\n` +
        `🔄 Check interval: ${config.checkIntervalMinutes} minutes\n` +
        `🔧 Auto-detect working days: ${config.autoDetectWorkingDays ? 'Enabled' : 'Disabled'}`
      );

      // Start health check server for Railway
      this.startHealthCheckServer();

      // Run initial check
      await this.checkCalendar();

      // Schedule periodic checks
      this.scheduleChecks();

      console.log('\n✅ Application started successfully!');
      console.log(`⏰ Next check in ${config.checkIntervalMinutes} minutes\n`);

      this.isRunning = true;
    } catch (error) {
      console.error('❌ Error starting application:', error);
      process.exit(1);
    }
  }

  private scheduleChecks(): void {
    setInterval(async () => {
      await this.checkCalendar();
    }, config.checkIntervalMinutes * 60 * 1000);
  }

  private async checkCalendar(): Promise<void> {
    const now = new Date();
    console.log(`\n🔍 Checking calendar at ${now.toLocaleString()}...`);

    try {
      // If auto-detect is enabled, update working days from upcoming events
      if (config.autoDetectWorkingDays) {
        await this.updateAutoDetectedWorkingDays();
      }

      // Get recent events (last 24 hours to catch newly added events)
      const recentEvents = await calendarService.getRecentEvents(24);
      console.log(`📊 Found ${recentEvents.length} events in the last 24 hours`);

      // Filter for events on working days that haven't been notified yet
      const newWorkingDayEvents = recentEvents.filter(event => {
        const isWorkingDay = storage.isWorkingDay(event.date);
        const notAlreadyNotified = !storage.isEventNotified(event.id);

        // Only include events that are in the future or today
        const eventDate = new Date(event.start);
        const isUpcoming = eventDate >= new Date(new Date().setHours(0, 0, 0, 0));

        return isWorkingDay && notAlreadyNotified && isUpcoming;
      });

      console.log(`📬 Found ${newWorkingDayEvents.length} new events on working days to notify`);

      // Send notifications for new events
      for (const event of newWorkingDayEvents) {
        await this.notifyEvent(event);
      }

      // Clean up old notified events periodically
      storage.cleanupOldEvents();

      this.lastCheckTime = now;
    } catch (error) {
      console.error('❌ Error checking calendar:', error);

      // Send error notification
      try {
        await telegramService.sendMessage(
          `⚠️ *Error checking calendar*\n\n${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } catch (notifyError) {
        console.error('❌ Error sending error notification:', notifyError);
      }
    }
  }

  private async updateAutoDetectedWorkingDays(): Promise<void> {
    try {
      // Get upcoming events (next 30 days)
      const upcomingEvents = await calendarService.getUpcomingEvents(30);

      // Extract unique dates from events
      const eventDates = calendarService.getEventDates(upcomingEvents);

      // Update auto-detected working days
      storage.setAutoDetectedWorkingDays(eventDates);

      console.log(`🔄 Auto-detected ${eventDates.length} working days from upcoming events`);
    } catch (error) {
      console.error('❌ Error auto-detecting working days:', error);
    }
  }

  private async notifyEvent(event: any): Promise<void> {
    try {
      const message = calendarService.formatEventForNotification(event);
      await telegramService.sendNotification(message);
      storage.markEventNotified(event.id);
      console.log(`✅ Notified about event: ${event.summary} on ${event.date}`);
    } catch (error) {
      console.error(`❌ Error notifying about event ${event.id}:`, error);
    }
  }

  private startHealthCheckServer(): void {
    const app = express();

    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        lastCheck: this.lastCheckTime?.toISOString() || 'Not yet checked',
        isRunning: this.isRunning,
        checkIntervalMinutes: config.checkIntervalMinutes,
      });
    });

    app.get('/', (req, res) => {
      res.send('Axtra Calendar Notifier is running!');
    });

    app.listen(config.port, () => {
      console.log(`🏥 Health check server running on port ${config.port}`);
    });
  }
}

// Start the application
const notifier = new CalendarNotifier();
notifier.start();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
