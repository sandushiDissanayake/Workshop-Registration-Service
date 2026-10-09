import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Consistent error body: { statusCode, error, message, details? } */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const obj = typeof body === 'string' ? { message: body } : (body as Record<string, any>);
      const message = Array.isArray(obj.message) ? 'Validation failed' : obj.message ?? exception.message;
      res.status(status).json({
        statusCode: status,
        error: obj.error ?? HttpStatus[status],
        message,
        ...(Array.isArray(obj.message) ? { details: obj.message } : {}),
        ...(obj.code ? { code: obj.code } : {}),
      });
      return;
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({ statusCode: 500, error: 'Internal Server Error', message: 'Something went wrong' });
  }
}
