/**
 * Outbox Pattern Interfaces
 *
 * Transactional Outbox Pattern đảm bảo:
 * - Events được lưu trong cùng transaction với aggregate
 * - At-least-once delivery guarantee
 * - Eventual consistency giữa Write Model và Read Model
 */

export * from './outbox.interface';
