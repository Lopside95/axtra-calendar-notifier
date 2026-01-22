import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

export interface Config {
  // Telegram Configuration
  telegramBotToken: string;
  telegramChatId: string;

  // Google Calendar Configuration
  calendarName: string;
  credentialsPath: string;
  tokenPath: string;

  // Application Configuration
  checkIntervalMinutes: number;
  dataPath: string;
  port: number;

  // Working Days Configuration
  autoDetectWorkingDays: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Helper function to handle base64-encoded credentials for Railway deployment
function getCredentialsPath(): string {
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      const decoded = Buffer.from(
        process.env.GOOGLE_CREDENTIALS,
        "base64",
      ).toString("utf-8");
      const tempPath = path.join("/tmp", "credentials.json");
      fs.writeFileSync(tempPath, decoded);
      console.log("Using base64-encoded Google credentials from environment");
      return tempPath;
    } catch (error) {
      console.error("Error decoding GOOGLE_CREDENTIALS:", error);
    }
  }
  return getEnvVar(
    "CREDENTIALS_PATH",
    path.join(__dirname, "..", "credentials.json"),
  );
}

// Helper function to handle base64-encoded token for Railway deployment
function getTokenPath(): string {
  if (process.env.GOOGLE_TOKEN) {
    try {
      const decoded = Buffer.from(process.env.GOOGLE_TOKEN, "base64").toString(
        "utf-8",
      );
      const tempPath = path.join("/tmp", "token.json");
      fs.writeFileSync(tempPath, decoded);
      console.log("Using base64-encoded Google token from environment");
      return tempPath;
    } catch (error) {
      console.error("Error decoding GOOGLE_TOKEN:", error);
    }
  }
  return getEnvVar("TOKEN_PATH", path.join(__dirname, "..", "token.json"));
}

export const config: Config = {
  // Telegram
  telegramBotToken: getEnvVar("TELEGRAM_BOT_TOKEN"),
  telegramChatId: getEnvVar("TELEGRAM_CHAT_ID"),

  // Google Calendar
  calendarName: getEnvVar("CALENDAR_NAME", "Axtrazh - Urban Axe Throwing"),
  credentialsPath: getCredentialsPath(),
  tokenPath: getTokenPath(),

  // Application
  checkIntervalMinutes: parseInt(getEnvVar("CHECK_INTERVAL_MINUTES", "30"), 10),
  dataPath: getEnvVar("DATA_PATH", path.join(__dirname, "..", "data")),
  port: parseInt(getEnvVar("PORT", "3000"), 10),

  // Working Days
  autoDetectWorkingDays:
    getEnvVar("AUTO_DETECT_WORKING_DAYS", "false") === "false",
};
