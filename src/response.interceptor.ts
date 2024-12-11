import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  
  @Injectable()
  export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Response<T>> {
      const now = Date.now();
      return next.handle().pipe(
        map((data) => ({
          statusCode: context.switchToHttp().getResponse().statusCode,
          timestamp: new Date().toISOString(),
          data,
          executionTime: `${Date.now() - now}ms`,
          path: context.switchToHttp().getRequest().url,
        })),
      );
    }
  }
  
  interface Response<T> {
    statusCode: number;
    timestamp: string;
    data: T;
    executionTime: string;
    path: string;
  }
  