import { Injectable, LoggerService, Optional } from '@nestjs/common';
import winston from 'winston';
import fluentLogger from 'fluent-logger';
import JSON from 'circular-json';
import configuration from "./config/configuration";

@Injectable()
export class MyLoggerService implements LoggerService {
  private logger: winston.Logger;
  constructor(
    @Optional() private readonly context?: string,
    @Optional() private readonly isTimestampEnabled = false,
  ) {
    this.logger = winston.createLogger({
      levels: winston.config.syslog.levels,
      level: configuration().logger.level,
      format: winston.format.json(),
      transports: configuration().fluentd.enabled ? [
        new winston.transports.Console(),
        new (fluentLogger.support.winstonTransport())(
          configuration().fluentd.tagPrefix,
          {
            host: configuration().fluentd.host,
            port: configuration().fluentd.port,
            timeout: 3.0,
            requireAckResponse: false,
            reconnectInterval: 60000, // 10 minutes
          },
        ),
      ] : [
        new winston.transports.Console(),
      ],
    });
    this.logger.on('error', (error) => {
      // tslint:disable-next-line:no-console
      console.log(error);
    });
  }

  debug(message: any, context?: string): any {
    this.printMessage('debug', message, context);
  }

  error(message: any, trace?: string, context?: string): any {
    this.printMessage('error', message, context, trace);
  }

  logError(error, context?: string) {
    this.error(error.message, error.stack, context);
    if (error.message && error.message instanceof Object) {
      const message = error.message.log || error.message.message || JSON.stringify(error.message);
      error = new Error(`${message} (see logs for details)`);
    }
    this.error(error.stack, null, context);
  }

  log(message: any, context?: string): any {
    this.printMessage('info', message, context);
  }

  verbose(message: any, context?: string): any {
    this.printMessage('notice', message, context);
  }

  warn(message: any, context?: string): any {
    this.printMessage('warning', message, context);
  }

  private printMessage(level: string, message: any, context?: string, trace?: string) {
    let record: any = {};
    let msg = '';

    if (message && typeof message === 'object') {
      record = message as any;
      msg = record.log || record.message;
    } else {
      record = {message};
      msg = message;
    }
    context = context || this.context;
    msg = context + ': ' + msg;
    record.context = context;
    if (trace) {
      record.trace = trace;
    }

    const time = new Date(Date.now()).toISOString();

    this.logger.log(level, msg, {time, record, severity: this.mapLevelToSeverity(level)});
  }

  private mapLevelToSeverity(level: string) {
    switch (level) {
      case 'emerg':
        return 'EMERGENCY';
      case 'alert':
        return 'ALERT';
      case 'crit':
        return 'CRITICAL';
      case 'error':
        return 'ERROR';
      case 'warning':
        return 'WARNING';
      case 'notice':
        return 'NOTICE';
      case 'info':
        return 'INFO';
      case 'debug':
        return 'DEBUG';
      default:
        return 'DEFAULT';
    }
  }
}
