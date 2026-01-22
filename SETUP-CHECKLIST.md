# Setup Checklist

Follow this checklist to get your Axtra Calendar Notifier up and running.

## Prerequisites
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] Google account with Google Calendar access
- [ ] Telegram account
- [ ] Railway account (for deployment)

## Local Setup

### 1. Install Dependencies
```bash
cd axtra-calendar-notifier
npm install
```

### 2. Get Google Calendar Credentials
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new project
- [ ] Enable Google Calendar API
- [ ] Create OAuth 2.0 Desktop app credentials
- [ ] Download `credentials.json` to project root

### 3. Create Telegram Bot
- [ ] Open Telegram, search for @BotFather
- [ ] Send `/newbot` and create your bot
- [ ] Save the bot token
- [ ] Send a message to your bot
- [ ] Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` to get your chat ID

### 4. Configure Environment
- [ ] Copy `.env.example` to `.env`
- [ ] Set `TELEGRAM_BOT_TOKEN`
- [ ] Set `TELEGRAM_CHAT_ID`
- [ ] Set `CALENDAR_NAME` (default: "Axtrazh - Urban Axe Throwing")
- [ ] Set `AUTO_DETECT_WORKING_DAYS` (default: true)

### 5. Authenticate with Google
```bash
npm run auth
```
- [ ] Open the URL shown in terminal
- [ ] Sign in and authorize
- [ ] Copy the code back to terminal
- [ ] Verify `token.json` was created

### 6. Test Locally (Optional)
```bash
npm run build
npm start
```
- [ ] Check terminal for success messages
- [ ] Verify Telegram message received
- [ ] Test with `/status` command in Telegram

## Railway Deployment

### 7. Prepare Credentials for Railway

#### Option A: Base64 Encoding (Recommended)

On macOS:
```bash
base64 credentials.json | pbcopy
# Paste into Railway as GOOGLE_CREDENTIALS

base64 token.json | pbcopy
# Paste into Railway as GOOGLE_TOKEN
```

On Linux:
```bash
base64 credentials.json
# Copy output to Railway as GOOGLE_CREDENTIALS

base64 token.json
# Copy output to Railway as GOOGLE_TOKEN
```

### 8. Deploy to Railway

#### Using Railway CLI:
```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set variables
railway variables set TELEGRAM_BOT_TOKEN="your_token"
railway variables set TELEGRAM_CHAT_ID="your_chat_id"
railway variables set GOOGLE_CREDENTIALS="<base64_credentials>"
railway variables set GOOGLE_TOKEN="<base64_token>"

# Deploy
railway up
```

- [ ] Railway CLI installed
- [ ] Logged in to Railway
- [ ] Project created
- [ ] All environment variables set
- [ ] Deployed successfully

#### Using Railway Dashboard:
- [ ] Go to [railway.app](https://railway.app)
- [ ] Create new project from GitHub repo
- [ ] Add all environment variables in Variables tab
- [ ] Verify deployment successful

### 9. Verify Deployment
- [ ] Check Railway logs for startup message
- [ ] Verify Telegram startup message received
- [ ] Test `/status` command in Telegram
- [ ] Visit health check endpoint: `<your-railway-url>/health`

## Post-Deployment

### 10. Configure Working Days

If using auto-detect (recommended):
- [ ] App will automatically detect working days from calendar events
- [ ] Verify with `/list_workdays` in Telegram

If using manual mode:
- [ ] Set `AUTO_DETECT_WORKING_DAYS=false`
- [ ] Add working days via `/add_workday YYYY-MM-DD`
- [ ] Verify with `/list_workdays`

### 11. Test Notifications
- [ ] Add a test event to your Axtra calendar on a working day
- [ ] Wait up to 30 minutes (or your configured interval)
- [ ] Verify you receive a Telegram notification

## Troubleshooting

If something doesn't work:

1. **Check Logs**
   - Local: Check terminal output
   - Railway: Check Railway dashboard logs

2. **Verify Environment Variables**
   - All required variables set?
   - Correct values?
   - No extra spaces or quotes?

3. **Check Telegram**
   - Bot token correct?
   - Chat ID is a number?
   - You sent a message to the bot first?

4. **Check Google Calendar**
   - Calendar name matches exactly?
   - credentials.json valid?
   - token.json generated?

5. **Common Errors**
   - "No token.json found" → Run `npm run auth`
   - "Calendar not found" → Check `CALENDAR_NAME`
   - "Bot not responding" → Verify bot token and chat ID
   - Railway deployment fails → Check all env vars are set

## Success!

Once everything is working:
- [ ] You receive a startup message in Telegram
- [ ] `/status` command works
- [ ] `/list_workdays` shows your working days
- [ ] New calendar events trigger notifications

You're all set! The app will now monitor your calendar and notify you of new events on working days.
