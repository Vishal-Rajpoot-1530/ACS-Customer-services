import winston from 'winston';
import { env } from './env.config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: time, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${time}] [${level}]: ${stack || message}${metaString}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    env.NODE_ENV === 'production' ? json() : combine(colorize(), consoleFormat)
  ),
  defaultMeta: { service: 'acs-backend' },
  transports: [
    new winston.transports.Console({
      silent: env.NODE_ENV === 'test' && env.LOG_LEVEL === 'error',
    }),
  ],
});
