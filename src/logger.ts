import winston from 'winston';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom format for console output (human-readable)
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }), // Enable stack traces for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      )
    }),

    // File transport for errors (with rotation support)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: json(), // Use JSON format for file logs
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport for all logs (with rotation support)
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: json(), // Use JSON format for file logs
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
  // Don't exit on uncaught errors
  exitOnError: false
});

// Create a stream for Morgan or other middleware (if needed later)
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export default logger;
