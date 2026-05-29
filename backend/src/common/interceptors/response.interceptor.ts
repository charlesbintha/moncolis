import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((responseData) => {
        // Si la réponse est déjà formatée (success, data)
        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
          return responseData;
        }

        // Si la réponse contient des métadonnées de pagination
        if (responseData && typeof responseData === 'object' && 'data' in responseData && 'pagination' in responseData) {
          return {
            success: true,
            ...responseData,
          };
        }

        return {
          success: true,
          data: responseData,
        };
      }),
    );
  }
}
