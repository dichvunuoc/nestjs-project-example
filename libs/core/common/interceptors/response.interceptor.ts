import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';
import { SuccessResponseDto } from '../http';

/**
 * Response Interceptor
 *
 * Automatically wraps successful responses in standardized format
 * Skips wrapping if response is already an ApiResponse
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    return next.handle().pipe(
      map((data) => {
        // If data is already a SuccessResponseDto, return as is
        if (data instanceof SuccessResponseDto) {
          // Add request context if not already present
          if (!data.path) {
            data.path = request.url;
          }
          if (!data.method) {
            data.method = request.method;
          }
          return data;
        }

        // If data is null or undefined, return no content response
        if (data === null || data === undefined) {
          return SuccessResponseDto.noContent();
        }

        // Wrap data in standardized response
        return SuccessResponseDto.ok(data);
      }),
    );
  }
}
