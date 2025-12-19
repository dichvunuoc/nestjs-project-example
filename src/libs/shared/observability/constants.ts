import { Tracer } from '@opentelemetry/api';
import { Meter } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';

// DI Tokens as Symbols
export const OPENTELEMETRY_SDK_TOKEN = Symbol('OpenTelemetrySDK');
export const TRACER_TOKEN = Symbol('OpenTelemetryTracer');
export const METER_TOKEN = Symbol('OpenTelemetryMeter');
export const METRICS_CONFIG_TOKEN = Symbol('METRICS_CONFIG');

/**
 * Metrics names for standardized measurement
 */
export const METRICS_NAMES = {
  // HTTP metrics
  HTTP_REQUEST_DURATION: 'http_request_duration_seconds',
  HTTP_REQUEST_COUNT: 'http_requests_total',
  HTTP_REQUEST_SIZE: 'http_request_size_bytes',
  HTTP_RESPONSE_SIZE: 'http_response_size_bytes',

  // Command/Query metrics
  COMMAND_DURATION: 'command_duration_seconds',
  COMMAND_COUNT: 'commands_total',
  COMMAND_ERRORS: 'command_errors_total',

  QUERY_DURATION: 'query_duration_seconds',
  QUERY_COUNT: 'queries_total',
  QUERY_ERRORS: 'query_errors_total',

  // Database metrics
  DB_QUERY_DURATION: 'database_query_duration_seconds',
  DB_CONNECTION_POOL_ACTIVE: 'database_connections_active',
  DB_CONNECTION_POOL_IDLE: 'database_connections_idle',

  // Cache metrics
  CACHE_HITS: 'cache_hits_total',
  CACHE_MISSES: 'cache_misses_total',
  CACHE_OPERATIONS: 'cache_operations_total',

  // Event metrics
  EVENT_PROCESSED: 'domain_events_processed_total',
  EVENT_FAILED: 'domain_events_failed_total',

  // Business metrics
  PRODUCTS_CREATED: 'products_created_total',
  ORDERS_CREATED: 'orders_created_total',
} as const;

/**
 * Span names for consistent tracing
 */
export const SPAN_NAMES = {
  // HTTP spans
  HTTP_REQUEST: 'http.request',
  HTTP_CONTROLLER: 'http.controller',

  // Command/Query spans
  COMMAND_HANDLER: 'command.handler',
  QUERY_HANDLER: 'query.handler',

  // Repository spans
  REPOSITORY_SAVE: 'repository.save',
  REPOSITORY_FIND: 'repository.find',
  REPOSITORY_DELETE: 'repository.delete',

  // Database spans
  DB_QUERY: 'database.query',
  DB_TRANSACTION: 'database.transaction',

  // Event spans
  EVENT_PUBLISH: 'event.publish',
  EVENT_HANDLER: 'event.handler',
} as const;

/**
 * Attribute keys for spans and metrics
 */
export const ATTRIBUTE_KEYS = {
  // HTTP attributes
  HTTP_METHOD: 'http.method',
  HTTP_ROUTE: 'http.route',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_URL: 'http.url',
  HTTP_USER_AGENT: 'http.user_agent',

  // Service attributes
  SERVICE_NAME: 'service.name',
  SERVICE_VERSION: 'service.version',

  // Operation attributes
  OPERATION_NAME: 'operation.name',
  OPERATION_TYPE: 'operation.type', // command, query, event
  COMMAND_NAME: 'command.name',
  QUERY_NAME: 'query.name',
  EVENT_NAME: 'event.name',

  // User attributes
  USER_ID: 'user.id',
  CORRELATION_ID: 'correlation.id',
  CAUSATION_ID: 'causation.id',

  // Error attributes
  ERROR_TYPE: 'error.type',
  ERROR_MESSAGE: 'error.message',
  ERROR_STACK: 'error.stack',

  // Business attributes
  PRODUCT_ID: 'product.id',
  ORDER_ID: 'order.id',
  CATEGORY: 'product.category',

  // Database attributes
  DB_SYSTEM: 'db.system',
  DB_NAME: 'db.name',
  DB_TABLE: 'db.table',
  DB_OPERATION: 'db.operation',

  // Cache attributes
  CACHE_KEY: 'cache.key',
  CACHE_OPERATION: 'cache.operation', // get, set, delete

  // Performance attributes
  RETRY_COUNT: 'retry.count',
  CIRCUIT_BREAKER_STATE: 'circuit_breaker.state',
} as const;
