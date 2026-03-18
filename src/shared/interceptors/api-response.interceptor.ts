import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface ApiSuccessResponse<T> {
  status: 'success';
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    if (context.getType() !== 'http') {
      return next.handle() as Observable<ApiSuccessResponse<T>>;
    }

    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<{ statusCode: number }>();
    const request = httpContext.getRequest<{ method: string }>();

    return next.handle().pipe(
      map((body: T) => {
        if (this.isAlreadyWrapped(body)) {
          return body as unknown as ApiSuccessResponse<T>;
        }

        const statusCode = response.statusCode ?? 200;
        return {
          status: 'success',
          code: statusCode,
          data: body,
          message: this.defaultMessage(request.method, statusCode),
        };
      }),
    );
  }

  private isAlreadyWrapped(body: unknown): boolean {
    if (!body || typeof body !== 'object') {
      return false;
    }

    const candidate = body as Record<string, unknown>;
    return (
      candidate.status === 'success' &&
      typeof candidate.code === 'number' &&
      'data' in candidate &&
      typeof candidate.message === 'string'
    );
  }

  private defaultMessage(method: string, statusCode: number): string {
    if (method === 'GET') {
      return 'Data retrieved successfully';
    }

    if (method === 'POST' && statusCode === 201) {
      return 'Resource created successfully';
    }

    if (method === 'PATCH' || method === 'PUT') {
      return 'Resource updated successfully';
    }

    if (method === 'DELETE') {
      return 'Resource deleted successfully';
    }

    return 'Request processed successfully';
  }
}
