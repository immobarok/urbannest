import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { plainToInstance, ClassTransformOptions } from 'class-transformer';

/** Metadata key holding the DTO class to serialize against. */
export const SERIALIZE_TYPE_KEY = 'serialize-type';

/**
 * Decorator that strips fields not present on the given DTO before sending the
 * response. Pair this with `class-transformer`'s `@Expose()` / `@Exclude()`
 * decorators to control which properties reach the client.
 *
 * @example
 * ```ts
 * @Serialize(UserResponseDto)
 * @Get('me')
 * getProfile() { ... }
 * ```
 */
export function Serialize(dto: new (...args: any[]) => any) {
  return function (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) {
    SetMetadata(SERIALIZE_TYPE_KEY, dto)(target, propertyKey!, descriptor!);
    UseInterceptors(SerializeInterceptor)(target, propertyKey!, descriptor!);
  };
}

/**
 * SerializeInterceptor - Strips sensitive / internal fields from outgoing
 * responses based on a DTO class decorated with `class-transformer` annotations.
 *
 * Apply via the `@Serialize(DtoClass)` decorator on individual routes or
 * controllers.
 */
@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  private static readonly defaultOptions: ClassTransformOptions = {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  };

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const dto = this.reflector.get<new (...args: any[]) => any>(
      SERIALIZE_TYPE_KEY,
      context.getHandler(),
    );

    if (!dto) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return data.map((item) =>
            plainToInstance(dto, item, SerializeInterceptor.defaultOptions),
          );
        }
        return plainToInstance(dto, data, SerializeInterceptor.defaultOptions);
      }),
    );
  }
}
