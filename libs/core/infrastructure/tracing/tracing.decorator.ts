import { SetMetadata } from '@nestjs/common';
import { SpanOptions } from './tracing.interface';

/**
 * Tracing Decorator Metadata Key
 */
export const TRACING_OPTIONS_KEY = 'tracing:options';

/**
 * Trace Decorator
 * 
 * Create span for method execution
 * 
 * Usage:
 * ```typescript
 * @Trace({ kind: SpanKind.CLIENT })
 * async callExternalService() {
 *   // ...
 * }
 * ```
 * 
 * Note: Requires TracingInterceptor to be applied
 */
export const Trace = (options?: SpanOptions) =>
  SetMetadata(TRACING_OPTIONS_KEY, options || {});
