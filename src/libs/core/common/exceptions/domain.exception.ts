/**
 * Domain Exception (Re-export from Domain Layer)
 *
 * This re-exports the pure DomainException from the Domain Layer
 * for backward compatibility with code that imports from @core/common.
 *
 * For new code in Domain Layer, import directly from @core/domain.
 * For Infrastructure Layer code, either import works.
 *
 * Dùng cho các lỗi nghiệp vụ logic (Business Rules)
 * Ví dụ: Tài khoản bị khóa, Số dư không đủ...
 */
export { DomainException } from '../../domain/exceptions';
