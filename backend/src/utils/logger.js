const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format for file
const fileFormat = combine(
  errors({ stack: true }), // Include stack trace in errors
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Custom log format for console
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
  })
);

const transports = [
  // Console output
  new winston.transports.Console({
    format: consoleFormat
  }),
  // Daily rotate file for errors only
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '30d', // Keep logs for 30 days
    format: fileFormat,
    zippedArchive: true, // Zip rotated files
  }),
  // Daily rotate file for all logs
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d', // Keep combined logs for 14 days
    format: fileFormat,
    zippedArchive: true,
  })
];

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports
});

const util = require('util');

// Override standard console methods to capture existing logs seamlessly
const captureConsole = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  const formatArgs = (args) => {
    return args.map(a => 
      typeof a === 'string' ? a : 
      (a instanceof Error ? a.stack : util.inspect(a, { depth: null }))
    ).join(' ');
  };

  console.log = (...args) => {
    logger.info(formatArgs(args));
    originalLog.apply(console, args);
  };

  console.error = (...args) => {
    logger.error(formatArgs(args));
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    logger.warn(formatArgs(args));
    originalWarn.apply(console, args);
  };

  console.info = (...args) => {
    logger.info(formatArgs(args));
    originalInfo.apply(console, args);
  };
};

module.exports = { logger, captureConsole };
