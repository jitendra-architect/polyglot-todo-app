import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    process.env['NODE_ENV'] === 'production'
      ? format.json()
      : format.combine(format.colorize(), format.simple()),
  ),
  transports: [new transports.Console()],
});
