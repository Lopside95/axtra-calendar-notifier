# Setup and Installation Guide

A Node.js application that monitors your Google Calendar for Axtra work events and sends Telegram notifications when new events are added on your working days.

## Features

- **Automatic Calendar Monitoring**: Checks your Google Calendar every 30 minutes (configurable)
- **Smart Working Day Detection**: Automatically detects working days from existing calendar events
- **Manual Working Day Management**: Add/remove working days via Telegram bot commands
- **Duplicate Prevention**: Tracks notified events to avoid sending duplicate notifications
- **Telegram Bot Commands**: Manage working days and check status directly from Telegram
- **Railway Deployment Ready**: Includes configuration for easy deployment to Railway
- **Health Check Endpoint**: Built-in health check for monitoring

## Prerequisites

- Node.js 18+ and npm
- A Google account with Google Calendar access
- A Telegram account
- A Railway account (for deployment)

## Project Structure

```
axtra-calendar-notifier/
├── src/
│   ├── index.ts           # Main application logic
│   ├── calendar.ts        # Google Calendar integration
│   ├── telegram.ts        # Telegram bot integration
│   ├── storage.ts         # Data persistence
│   ├── config.ts          # Configuration management
│   └── auth.ts            # OAuth authentication helper
├── data/
│   ├── working-days.json  # Persisted working days (auto-generated)
│   └── notified-events.json # Tracked events (auto-generated)
├── credentials.json       # Google OAuth credentials (you provide)
├── token.json            # OAuth token (auto-generated)
├── .env                  # Environment variables (you create)
├── .env.example          # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Setup Instructions

### 1. Clone and Install

```bash
cd axtra-calendar-notifier
npm install
```

### 2. Get Google Calendar Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as the application type
   - Name it "Axtra Calendar Notifier"
   - Click "Create"
5. Download the credentials:
   - Click the download icon next to your newly created OAuth client
   - Save the file as `credentials.json` in the project root

### 3. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the prompts to create your bot
3. Save the **Bot Token** you receive (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Get your Chat ID:
   - Send a message to your bot
   - Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for the `"chat":{"id":` value (e.g., `123456789`)

### 4. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```bash
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   CALENDAR_NAME=Axtrazh - Urban Axe Throwing
   AUTO_DETECT_WORKING_DAYS=true
   CHECK_INTERVAL_MINUTES=30
   ```

### 5. Authenticate with Google Calendar (Local Setup)

Before deploying to Railway, you need to generate the `token.json` file locally:

```bash
npm run auth
```

This will:
1. Display a URL in your terminal
2. Open the URL in your browser
3. Sign in with your Google account
4. Grant calendar read permissions
5. Copy the authorization code
6. Paste it back in the terminal

A `token.json` file will be created in your project root.

### 6. Test Locally (Optional)

```bash
npm run build
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

You should see:
- Google Calendar API initialized
- Telegram bot started
- A message in Telegram confirming the bot is running

### 7. Deploy to Railway

#### Option A: Using Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Create a new project:
   ```bash
   railway init
   ```

4. Set environment variables in Railway:
   ```bash
   railway variables set TELEGRAM_BOT_TOKEN="your_token"
   railway variables set TELEGRAM_CHAT_ID="your_chat_id"
   railway variables set CALENDAR_NAME="Axtrazh - Urban Axe Throwing"
   railway variables set AUTO_DETECT_WORKING_DAYS="true"
   railway variables set CHECK_INTERVAL_MINUTES="30"
   ```

5. Add credentials.json and token.json as environment variables:
   ```bash
   # Convert credentials.json to base64
   base64 credentials.json | pbcopy  # On macOS
   # or
   base64 credentials.json           # On Linux

   # Then set in Railway dashboard as multiline variable
   railway variables set GOOGLE_CREDENTIALS="<paste_base64_here>"

   # Same for token.json
   base64 token.json | pbcopy
   railway variables set GOOGLE_TOKEN="<paste_base64_here>"
   ```

6. Update `src/config.ts` to handle base64 credentials (see Railway deployment section below)

7. Deploy:
   ```bash
   railway up
   ```

#### Option B: Using Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables in the "Variables" tab:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `CALENDAR_NAME`
   - `AUTO_DETECT_WORKING_DAYS`
   - `CHECK_INTERVAL_MINUTES`
   - `GOOGLE_CREDENTIALS` (base64 encoded credentials.json)
   - `GOOGLE_TOKEN` (base64 encoded token.json)

5. Railway will automatically detect the Node.js app and deploy it

### Handling Credentials on Railway

To use the base64-encoded credentials, update `src/config.ts`:

```typescript
// Add helper function at the top
function getCredentialsPath(): string {
  if (process.env.GOOGLE_CREDENTIALS) {
    const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString('utf-8');
    const tempPath = path.join('/tmp', 'credentials.json');
    fs.writeFileSync(tempPath, decoded);
    return tempPath;
  }
  return getEnvVar('CREDENTIALS_PATH', path.join(__dirname, '..', 'credentials.json'));
}

function getTokenPath(): string {
  if (process.env.GOOGLE_TOKEN) {
    const decoded = Buffer.from(process.env.GOOGLE_TOKEN, 'base64').toString('utf-8');
    const tempPath = path.join('/tmp', 'token.json');
    fs.writeFileSync(tempPath, decoded);
    return tempPath;
  }
  return getEnvVar('TOKEN_PATH', path.join(__dirname, '..', 'token.json'));
}

// Then in the config object:
export const config: Config = {
  // ...
  credentialsPath: getCredentialsPath(),
  tokenPath: getTokenPath(),
  // ...
};
```

## Working Days Configuration

### Auto-Detect Mode (Recommended)

Set `AUTO_DETECT_WORKING_DAYS=true` in your `.env` file.

The app will:
- Scan your Axtra calendar for existing events
- Automatically detect which days have Axtra events
- Consider those days as working days
- Update the list every time it checks the calendar

This is perfect for varying schedules!

### Manual Mode

Set `AUTO_DETECT_WORKING_DAYS=false` in your `.env` file.

Use Telegram commands to manage working days:
- `/add_workday 2026-01-25` - Add a specific date
- `/remove_workday 2026-01-25` - Remove a date
- `/list_workdays` - See all upcoming working days
- `/clear_workdays` - Clear all manual working days

### Hybrid Mode

You can use both! Set `AUTO_DETECT_WORKING_DAYS=true` and also manually add working days. The app will combine both lists.

## Telegram Bot Commands

Send these commands to your Telegram bot:

- `/start` or `/help` - Show available commands
- `/status` - Check if the bot is running and see configuration
- `/add_workday YYYY-MM-DD` - Add a working day
- `/remove_workday YYYY-MM-DD` - Remove a working day
- `/list_workdays` - Show upcoming working days (next 30 days)
- `/clear_workdays` - Clear all manually added working days

## How It Works

1. **Initialization**:
   - Connects to Google Calendar API
   - Starts Telegram bot
   - Sends startup confirmation message

2. **Periodic Checks** (every 30 minutes by default):
   - Fetches events from the last 24 hours from Axtra calendar
   - If auto-detect is enabled, updates working days from upcoming events
   - Filters events to find new ones on working days
   - Sends Telegram notifications for new events
   - Marks events as notified to avoid duplicates

3. **Notifications**:
   - Only sends notifications for events on working days
   - Includes event title, date, time, duration, and description
   - Avoids duplicate notifications by tracking event IDs

4. **Data Persistence**:
   - Working days stored in `data/working-days.json`
   - Notified events stored in `data/notified-events.json`
   - Both files survive app restarts and redeployments

## Monitoring

### Health Check

The app exposes a health check endpoint at `http://localhost:3000/health` (or your Railway URL).

Response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "lastCheck": "2026-01-22T10:30:00.000Z",
  "isRunning": true,
  "checkIntervalMinutes": 30
}
```

### Logs

View logs in Railway dashboard or locally with:
```bash
railway logs
```

## Troubleshooting

### "No token.json found" Error

**Solution**: Run `npm run auth` locally to generate the token file.

### "Calendar not found" Error

**Solution**: Check that `CALENDAR_NAME` in `.env` exactly matches your calendar name in Google Calendar.

### Telegram bot not responding

**Solution**:
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Verify `TELEGRAM_CHAT_ID` is correct (it's a number, not a username)
- Check that you've sent at least one message to the bot

### Not receiving notifications

**Solution**:
- Check that events are on working days: `/list_workdays`
- Verify auto-detect is working: check logs for "Auto-detected X working days"
- Check if events were already notified before the app started

### Railway deployment fails

**Solution**:
- Ensure all environment variables are set
- Check Railway logs for specific errors
- Verify `GOOGLE_CREDENTIALS` and `GOOGLE_TOKEN` are valid base64 strings

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Watch Mode

```bash
npm run watch
```

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | - | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | Yes | - | Your Telegram chat ID |
| `CALENDAR_NAME` | No | Axtrazh - Urban Axe Throwing | Name of the calendar to monitor |
| `CHECK_INTERVAL_MINUTES` | No | 30 | How often to check the calendar (in minutes) |
| `AUTO_DETECT_WORKING_DAYS` | No | true | Auto-detect working days from calendar events |
| `PORT` | No | 3000 | Port for health check server |
| `CREDENTIALS_PATH` | No | ./credentials.json | Path to Google OAuth credentials |
| `TOKEN_PATH` | No | ./token.json | Path to Google OAuth token |
| `DATA_PATH` | No | ./data | Directory for data files |

## Support

For issues or questions, please check:
- The troubleshooting section above
- Railway logs for deployment issues
- Google Calendar API documentation
- Telegram Bot API documentation
