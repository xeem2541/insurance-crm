const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists only if not on Vercel
const logDir = path.join(__dirname, '../../logs');
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL;

if (!isVercel) {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (err) {
    console.warn("[Logger] Could not create logs directory, file logging will be disabled.");
  }
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format for file (Structured Logging)
const fileFormat = combine(
  errors({ stack: true }), // Include stack trace in errors
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
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
    format: process.env.NODE_ENV === 'production' ? fileFormat : consoleFormat
  })
];

// Only add file transports if not on Vercel and directory exists
if (!isVercel && fs.existsSync(logDir)) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      format: fileFormat,
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: fileFormat,
      zippedArchive: true,
    })
  );
}

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
