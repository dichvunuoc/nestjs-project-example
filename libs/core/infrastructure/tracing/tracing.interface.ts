/**
 * Tracing Service Interface
 */
export interface ITracingService {
  /**
   * Start a new span
   */
  startSpan(name: string, options?: SpanOptions): ISpan;

  /**
   * Get current span
   */
  getCurrentSpan(): ISpan | undefined;

  /**
   * Set span context
   */
  setSpanContext(context: SpanContext): void;

  /**
   * Get span context
   */
  getSpanContext(): SpanContext | undefined;
}

/**
 * Span Interface
 */
export interface ISpan {
  /**
   * Set span attribute
   */
  setAttribute(key: string, value: string | number | boolean): void;

  /**
   * Set span attributes
   */
  setAttributes(attributes: Record<string, string | number | boolean>): void;

  /**
   * Add event to span
   */
  addEvent(name: string, attributes?: Record<string, any>): void;

  /**
   * Set span status
   */
  setStatus(status: SpanStatus): void;

  /**
   * End span
   */
  end(): void;

  /**
   * Get span context
   */
  spanContext(): SpanContext;
}

/**
 * Span Options
 */
export interface SpanOptions {
  /**
   * Span kind
   */
  kind?: SpanKind;

  /**
   * Parent span context
   */
  parent?: SpanContext;

  /**
   * Attributes
   */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Span Kind
 */
export enum SpanKind {
  INTERNAL = 'INTERNAL',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER',
}

/**
 * Span Status
 */
export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

/**
 * Span Status Code
 */
export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

/**
 * Span Context
 */
export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags?: number;
}
