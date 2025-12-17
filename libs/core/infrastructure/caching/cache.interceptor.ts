import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { ICacheService } from './cache.interface';
import { Reflector } from '@nestjs/core';

/**
 * NestJS Cache Interceptor
 * Automatically caches HTTP responses based on decorators
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject('ICacheService') private readonly cacheService: ICacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    request.url;
    // const response = context.switchToHttp().getResponse();

    // Get cache configuration from metadata
    const cacheTime = this.reflector.get<number>(
      'cache_time',
      context.getHandler(),
    );
    const cacheKey = this.reflector.get<string>(
      'cache_key',
      context.getHandler(),
    );

    // Skip caching if not configured or not GET request
    if (!cacheTime || request.method !== 'GET') {
      return next.handle();
    }

    // Generate cache key
    const key = cacheKey || `${request.url}`;

    // Check cache first
    return new Observable((observer) => {
      this.cacheService
        .get(key)
        .then((cached) => {
          if (cached) {
            // Return cached response
            observer.next(cached);
            observer.complete();
          } else {
            // Get fresh response
            next
              .handle()
              .pipe(
                tap((data) => {
                  // Cache the response
                  this.cacheService.set(key, data, cacheTime);
                }),
              )
              .subscribe(observer);
          }
        })
        .catch((error) => {
          // On cache error, proceed with request
          next.handle().subscribe(observer);
        });
    });
  }
}

/**
 * Cache control decorator for HTTP endpoints
 */
export const Cache = (ttl: number) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (descriptor) {
      // Method decorator
      Reflect.defineMetadata('cache_time', ttl, descriptor.value);
    } else if (propertyKey) {
      // Parameter decorator (not used for caching)
    } else {
      // Class decorator - apply to all methods
      const methods = Object.getOwnPropertyNames(target.prototype);
      methods.forEach((method) => {
        if (method !== 'constructor') {
          Reflect.defineMetadata('cache_time', ttl, target.prototype[method]);
        }
      });
    }
  };
};
