# Booking Notifier

A TypeScript application that integrates Google Calendar API with Telegram to send smart notifications for work schedule changes.

## The Problem

Working part-time with a variable schedule, I needed notifications when my work calendar changed - but only on days I was actually working, not every time something was added.

## The Solution

Built an automated notification system that:

- Monitors Google Calendar via API
- Auto-detects working days from existing calendar events
- Sends Telegram notifications only for relevant changes
- Deployed continuously on Railway

## Tech

- **TypeScript/Node.js** - Type-safe backend
- **Google Calendar API** - OAuth 2.0 integration
- **Telegram Bot API** - Real-time notifications
- **Railway** - Cloud deployment with health checks
- **Express** - Health monitoring endpoint

## What I Learned

- Implementing OAuth 2.0 flows for Google APIs
- Building stateful Telegram bots with command handlers
- Managing secrets and credentials in cloud deployments
- Designing flexible scheduling systems
- Setting up continuous deployment pipelines

## Want to Use This?

Full setup and deployment instructions are available in [SETUP.md](SETUP.md).

## License

ISC

---

_Note: Built with Claude Code to accelerate development, focusing on architecture design, API integration, and deployment configuration._
