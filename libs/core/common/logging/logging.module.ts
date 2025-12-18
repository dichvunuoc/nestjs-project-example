import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';

/**
 * Logging Module
 *
 * Provides structured logging using Pino.
 * Features:
 * - JSON structured logs for production
 * - Pretty printing for development
 * - Request ID correlation
 * - Automatic request/response logging
 */
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // Generate unique request ID for correlation
        genReqId: (req, res) => {
          const existingId = req.headers['x-request-id'];
          if (existingId) return existingId as string;
          return randomUUID();
        },

        // Custom log level based on status code
        customLogLevel: (req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },

        // Custom success message
        customSuccessMessage: (req, res) => {
          return `${req.method} ${req.url} completed`;
        },

        // Custom error message
        customErrorMessage: (req, res, err) => {
          return `${req.method} ${req.url} failed: ${err.message}`;
        },

        // Redact sensitive information
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
            'req.body.secret',
          ],
          censor: '[REDACTED]',
        },

        // Serializers for request/response
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            // Don't log full headers, just relevant ones
            headers: {
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
              'x-request-id': req.headers['x-request-id'],
            },
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },

        // Transport configuration
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  levelFirst: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined, // Use default JSON in production

        // Base logging options
        level: process.env.LOG_LEVEL || 'info',

        // Add timestamp
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
