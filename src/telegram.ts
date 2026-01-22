import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';
import { storage } from './storage';

class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  constructor() {
    this.bot = new TelegramBot(config.telegramBotToken, { polling: false });
    this.chatId = config.telegramChatId;
  }

  // Enable polling for bot commands
  enablePolling(): void {
    this.bot.stopPolling();
    this.bot = new TelegramBot(config.telegramBotToken, { polling: true });
    this.setupCommands();
    console.log('Telegram bot polling enabled');
  }

  private setupCommands(): void {
    // Help command
    this.bot.onText(/\/start/, (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      this.sendMessage(this.getHelpMessage());
    });

    this.bot.onText(/\/help/, (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      this.sendMessage(this.getHelpMessage());
    });

    // Status command
    this.bot.onText(/\/status/, (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      let message = '✅ *Bot Status*\n\n';
      message += `🤖 Bot is running\n`;
      message += `⏱ Uptime: ${hours}h ${minutes}m\n`;
      message += `📅 Calendar: ${config.calendarName}\n`;
      message += `🔄 Check interval: ${config.checkIntervalMinutes} minutes\n`;
      message += `🔧 Auto-detect working days: ${config.autoDetectWorkingDays ? 'Enabled' : 'Disabled'}\n`;

      this.sendMessage(message);
    });

    // Add working day
    this.bot.onText(/\/add_workday (.+)/, (msg, match) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      if (!match || !match[1]) {
        this.sendMessage('❌ Please provide a date in YYYY-MM-DD format\nExample: /add_workday 2026-01-25');
        return;
      }

      const date = match[1].trim();
      if (!this.isValidDate(date)) {
        this.sendMessage('❌ Invalid date format. Please use YYYY-MM-DD\nExample: /add_workday 2026-01-25');
        return;
      }

      storage.addWorkingDay(date);
      this.sendMessage(`✅ Added ${date} as a working day`);
    });

    // Remove working day
    this.bot.onText(/\/remove_workday (.+)/, (msg, match) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      if (!match || !match[1]) {
        this.sendMessage('❌ Please provide a date in YYYY-MM-DD format\nExample: /remove_workday 2026-01-25');
        return;
      }

      const date = match[1].trim();
      storage.removeWorkingDay(date);
      this.sendMessage(`✅ Removed ${date} from working days`);
    });

    // List working days
    this.bot.onText(/\/list_workdays/, (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const upcomingDays = storage.getUpcomingWorkingDays();

      if (upcomingDays.length === 0) {
        this.sendMessage('📅 No upcoming working days found in the next 30 days');
        return;
      }

      let message = '📅 *Upcoming Working Days* (next 30 days)\n\n';

      if (config.autoDetectWorkingDays) {
        const autoDays = storage.getAutoDetectedWorkingDays();
        const manualDays = storage.getWorkingDays().filter(d => !autoDays.includes(d));

        upcomingDays.forEach(date => {
          const isAuto = autoDays.includes(date);
          const isManual = manualDays.includes(date);
          const dateObj = new Date(date + 'T00:00:00');
          const formatted = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          });

          let badge = '';
          if (isAuto && isManual) {
            badge = ' 🔄+✏️';
          } else if (isAuto) {
            badge = ' 🔄';
          } else if (isManual) {
            badge = ' ✏️';
          }

          message += `• ${date} (${formatted})${badge}\n`;
        });

        message += '\n🔄 = Auto-detected\n✏️ = Manually added';
      } else {
        upcomingDays.forEach(date => {
          const dateObj = new Date(date + 'T00:00:00');
          const formatted = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          });
          message += `• ${date} (${formatted})\n`;
        });
      }

      this.sendMessage(message);
    });

    // Clear working days
    this.bot.onText(/\/clear_workdays/, (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      storage.clearWorkingDays();
      this.sendMessage('✅ Cleared all manually added working days\n\n' +
        (config.autoDetectWorkingDays ? 'Auto-detected working days are still active' : ''));
    });

    // Handle unknown commands
    this.bot.on('message', (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      if (!msg.text || msg.text.startsWith('/')) return;

      // Only respond to non-command messages if they seem like questions
      if (msg.text.includes('?')) {
        this.sendMessage('Try /help to see available commands');
      }
    });
  }

  private getHelpMessage(): string {
    let message = '🤖 *Axtra Calendar Notifier Bot*\n\n';
    message += 'I monitor your Axtra calendar and notify you when new events are added on your working days.\n\n';
    message += '*Available Commands:*\n\n';
    message += '/status - Check if the bot is running\n';
    message += '/add_workday YYYY-MM-DD - Add a working day\n';
    message += '/remove_workday YYYY-MM-DD - Remove a working day\n';
    message += '/list_workdays - Show upcoming working days\n';
    message += '/clear_workdays - Clear all manually added working days\n';
    message += '/help - Show this help message\n';

    if (config.autoDetectWorkingDays) {
      message += '\n💡 *Auto-detect is enabled*\nWorking days are automatically detected from existing Axtra events in your calendar.';
    }

    return message;
  }

  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString + 'T00:00:00');
    return !isNaN(date.getTime());
  }

  async sendMessage(text: string): Promise<void> {
    try {
      await this.bot.sendMessage(this.chatId, text, { parse_mode: 'Markdown' });
      console.log('Telegram message sent successfully');
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  async sendNotification(message: string): Promise<void> {
    await this.sendMessage(message);
  }
}

// Export singleton instance
export const telegramService = new TelegramService();
