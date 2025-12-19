/**
 * Common - Base Exceptions & Cross-cutting Concerns
 *
 * Contains:
 * - Base exception classes
 * - Request context interfaces (Correlation ID, etc.)
 *
 * HTTP components (filters, interceptors, pipes) are in @shared/http.
 */

export * from './exceptions';
export * from './context';
