import fs from 'fs';
import path from 'path';
import { config } from './config';

export interface StorageData {
  workingDays: string[]; // Array of dates in YYYY-MM-DD format
  notifiedEvents: string[]; // Array of event IDs that have been notified
  autoDetectedWorkingDays: string[]; // Array of auto-detected working days
}

class Storage {
  private workingDaysPath: string;
  private notifiedEventsPath: string;
  private data: StorageData;

  constructor() {
    // Ensure data directory exists
    if (!fs.existsSync(config.dataPath)) {
      fs.mkdirSync(config.dataPath, { recursive: true });
    }

    this.workingDaysPath = path.join(config.dataPath, 'working-days.json');
    this.notifiedEventsPath = path.join(config.dataPath, 'notified-events.json');

    this.data = this.loadData();
  }

  private loadData(): StorageData {
    const defaultData: StorageData = {
      workingDays: [],
      notifiedEvents: [],
      autoDetectedWorkingDays: [],
    };

    try {
      // Load working days
      if (fs.existsSync(this.workingDaysPath)) {
        const workingDaysContent = fs.readFileSync(this.workingDaysPath, 'utf-8');
        const workingDaysData = JSON.parse(workingDaysContent);
        defaultData.workingDays = workingDaysData.manualWorkingDays || [];
        defaultData.autoDetectedWorkingDays = workingDaysData.autoDetectedWorkingDays || [];
      }

      // Load notified events
      if (fs.existsSync(this.notifiedEventsPath)) {
        const notifiedEventsContent = fs.readFileSync(this.notifiedEventsPath, 'utf-8');
        defaultData.notifiedEvents = JSON.parse(notifiedEventsContent);
      }
    } catch (error) {
      console.error('Error loading storage data:', error);
    }

    return defaultData;
  }

  private saveWorkingDays(): void {
    const data = {
      manualWorkingDays: this.data.workingDays,
      autoDetectedWorkingDays: this.data.autoDetectedWorkingDays,
    };
    fs.writeFileSync(this.workingDaysPath, JSON.stringify(data, null, 2));
  }

  private saveNotifiedEvents(): void {
    // Keep only the last 1000 events to prevent file from growing too large
    const eventsToSave = this.data.notifiedEvents.slice(-1000);
    fs.writeFileSync(this.notifiedEventsPath, JSON.stringify(eventsToSave, null, 2));
  }

  // Working Days Management
  getWorkingDays(): string[] {
    if (config.autoDetectWorkingDays) {
      // Return both manual and auto-detected working days
      return [...new Set([...this.data.workingDays, ...this.data.autoDetectedWorkingDays])];
    }
    return this.data.workingDays;
  }

  addWorkingDay(date: string): void {
    if (!this.data.workingDays.includes(date)) {
      this.data.workingDays.push(date);
      this.data.workingDays.sort();
      this.saveWorkingDays();
    }
  }

  removeWorkingDay(date: string): void {
    this.data.workingDays = this.data.workingDays.filter(d => d !== date);
    this.saveWorkingDays();
  }

  clearWorkingDays(): void {
    this.data.workingDays = [];
    this.saveWorkingDays();
  }

  setAutoDetectedWorkingDays(dates: string[]): void {
    this.data.autoDetectedWorkingDays = [...new Set(dates)].sort();
    this.saveWorkingDays();
  }

  getAutoDetectedWorkingDays(): string[] {
    return this.data.autoDetectedWorkingDays;
  }

  // Check if a date is a working day
  isWorkingDay(date: string): boolean {
    return this.getWorkingDays().includes(date);
  }

  // Get upcoming working days (next 30 days)
  getUpcomingWorkingDays(): string[] {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    const todayStr = this.formatDate(today);
    const futureStr = this.formatDate(futureDate);

    return this.getWorkingDays().filter(date => date >= todayStr && date <= futureStr).sort();
  }

  // Notified Events Management
  isEventNotified(eventId: string): boolean {
    return this.data.notifiedEvents.includes(eventId);
  }

  markEventNotified(eventId: string): void {
    if (!this.data.notifiedEvents.includes(eventId)) {
      this.data.notifiedEvents.push(eventId);
      this.saveNotifiedEvents();
    }
  }

  // Utility
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Clean up old notified events (older than 90 days)
  cleanupOldEvents(): void {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // This is a simple cleanup - in production you might want to store timestamps with event IDs
    // For now, we just keep the last 1000 events
    this.saveNotifiedEvents();
  }
}

// Export singleton instance
export const storage = new Storage();
