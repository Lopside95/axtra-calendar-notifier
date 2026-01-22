# Telegram Bot Commands Reference

Quick reference for all available Telegram bot commands.

## Basic Commands

### `/start` or `/help`
Shows the help message with all available commands.

**Example:**
```
/help
```

### `/status`
Check if the bot is running and view current configuration.

**Example:**
```
/status
```

**Response includes:**
- Bot running status
- Uptime
- Calendar being monitored
- Check interval
- Auto-detect setting

## Working Day Management

### `/add_workday YYYY-MM-DD`
Add a specific date as a working day.

**Example:**
```
/add_workday 2026-01-25
```

**Response:**
```
✅ Added 2026-01-25 as a working day
```

### `/remove_workday YYYY-MM-DD`
Remove a specific date from working days.

**Example:**
```
/remove_workday 2026-01-25
```

**Response:**
```
✅ Removed 2026-01-25 from working days
```

### `/list_workdays`
Show all upcoming working days (next 30 days).

**Example:**
```
/list_workdays
```

**Response shows:**
- All working days in next 30 days
- Day of week and formatted date
- Whether each day is auto-detected (🔄) or manually added (✏️)

**Example Response:**
```
📅 Upcoming Working Days (next 30 days)

• 2026-01-24 (Sat, Jan 24) 🔄
• 2026-01-25 (Sun, Jan 25) 🔄+✏️
• 2026-01-31 (Sat, Jan 31) ✏️

🔄 = Auto-detected
✏️ = Manually added
```

### `/clear_workdays`
Clear all manually added working days.

**Example:**
```
/clear_workdays
```

**Response:**
```
✅ Cleared all manually added working days

Auto-detected working days are still active
```

**Note:** This only clears manually added days. Auto-detected days remain if auto-detect is enabled.

## Notification Format

When a new event is detected on a working day, you'll receive:

```
📅 New Axtra Event

Your Event Title

📆 Friday, January 24, 2026
🕐 2:00 PM - 6:00 PM
⏱ Duration: 4h 0m

📝 Event description if any
```

## Tips

1. **Auto-Detect Mode** (recommended)
   - Set `AUTO_DETECT_WORKING_DAYS=true`
   - App automatically finds working days from existing calendar events
   - You can still manually add/remove days

2. **Manual Mode**
   - Set `AUTO_DETECT_WORKING_DAYS=false`
   - Manage all working days via Telegram commands
   - More control but requires manual updates

3. **Hybrid Mode** (best of both worlds)
   - Keep auto-detect enabled
   - Manually add extra days as needed
   - System combines both lists

## Common Workflows

### Check if working today
```
/list_workdays
```
Look for today's date in the list.

### Add next week's shifts
```
/add_workday 2026-01-27
/add_workday 2026-01-28
/add_workday 2026-01-30
```

### Remove a cancelled shift
```
/remove_workday 2026-01-25
```

### Start fresh with manual days
```
/clear_workdays
/add_workday 2026-02-01
/add_workday 2026-02-02
```

### Check bot health
```
/status
```

## Troubleshooting Commands

If notifications aren't working:

1. Check bot is running:
   ```
   /status
   ```

2. Verify your working days:
   ```
   /list_workdays
   ```

3. If no working days shown and auto-detect is on:
   - Make sure you have Axtra events in your calendar
   - Wait for next calendar check (up to 30 minutes)
   - Check the calendar name matches exactly

## Security Note

The bot only responds to messages from your configured `TELEGRAM_CHAT_ID`. Messages from other users are ignored for security.
