# Các Thành Phần Chung Còn Thiếu Cho NestJS Enterprise Project

## 📋 Tổng Quan

Dự án hiện tại đã có:
- ✅ Exception handling (BaseException, DomainException, ValidationException, ConcurrencyException)
- ✅ CQRS pattern (Commands, Queries, Events)
- ✅ Caching (Redis, Memory)
- ✅ Domain entities và aggregates
- ✅ Repository pattern
- ✅ Event bus
- ✅ Projections
- ✅ Database adapters

## 🔴 Các Thành Phần Cần Bổ Sung

### 1. **HTTP & Response Handling**

#### 1.1. Response DTOs & Wrappers
- `libs/core/common/http/response.dto.ts` - Standardized response format
- `libs/core/common/http/pagination.dto.ts` - Pagination response wrapper
- `libs/core/common/http/response.interceptor.ts` - Auto-wrap responses

#### 1.2. HTTP Status Codes & Utilities
- `libs/core/common/http/http-status.enum.ts` - Custom HTTP status codes
- `libs/core/common/http/http-utils.ts` - HTTP helper functions

### 2. **Exception Handling**

#### 2.1. Global Exception Filter
- `libs/core/common/filters/global-exception.filter.ts` - Catch all exceptions
- `libs/core/common/filters/http-exception.filter.ts` - Handle HTTP exceptions
- `libs/core/common/filters/validation-exception.filter.ts` - Handle validation errors

#### 2.2. Missing Exception Types
- `libs/core/common/exceptions/not-found.exception.ts` - Resource not found
- `libs/core/common/exceptions/unauthorized.exception.ts` - Unauthorized access
- `libs/core/common/exceptions/forbidden.exception.ts` - Forbidden access
- `libs/core/common/exceptions/conflict.exception.ts` - Resource conflict
- `libs/core/common/exceptions/business-rule.exception.ts` - Business rule violations (alias cho DomainException)

### 3. **Authentication & Authorization**

#### 3.1. Guards
- `libs/core/common/guards/jwt-auth.guard.ts` - JWT authentication guard
- `libs/core/common/guards/roles.guard.ts` - Role-based access control
- `libs/core/common/guards/permissions.guard.ts` - Permission-based access control

#### 3.2. Decorators
- `libs/core/common/decorators/current-user.decorator.ts` - Get current user
- `libs/core/common/decorators/roles.decorator.ts` - Role decorator
- `libs/core/common/decorators/permissions.decorator.ts` - Permission decorator
- `libs/core/common/decorators/public.decorator.ts` - Public endpoint decorator

#### 3.3. JWT Utilities
- `libs/core/common/auth/jwt.service.ts` - JWT token service
- `libs/core/common/auth/jwt-payload.interface.ts` - JWT payload interface

### 4. **Validation**

#### 4.1. Custom Validation Pipes
- `libs/core/common/pipes/validation.pipe.ts` - Enhanced validation pipe
- `libs/core/common/pipes/parse-uuid.pipe.ts` - UUID validation pipe
- `libs/core/common/pipes/parse-int.pipe.ts` - Integer validation pipe

#### 4.2. Custom Validators
- `libs/core/common/validators/is-email.validator.ts` - Email validator
- `libs/core/common/validators/is-strong-password.validator.ts` - Password strength validator
- `libs/core/common/validators/is-unique.validator.ts` - Unique value validator

### 5. **Logging**

#### 5.1. Logger Service
- `libs/core/common/logger/logger.service.ts` - Centralized logging service
- `libs/core/common/logger/logger.module.ts` - Logger module
- `libs/core/common/logger/logger.interface.ts` - Logger interface

#### 5.2. Logging Interceptors
- `libs/core/common/interceptors/logging.interceptor.ts` - Request/response logging
- `libs/core/common/interceptors/request-id.interceptor.ts` - Request ID tracking

### 6. **Pagination**

#### 6.1. Pagination DTOs
- `libs/core/common/pagination/pagination.dto.ts` - Pagination request DTO
- `libs/core/common/pagination/pagination-response.dto.ts` - Pagination response DTO
- `libs/core/common/pagination/pagination-query.dto.ts` - Query pagination DTO

#### 6.2. Pagination Utilities
- `libs/core/common/pagination/pagination.utils.ts` - Pagination helper functions

### 7. **Request Tracking & Correlation**

#### 7.1. Request ID
- `libs/core/common/interceptors/correlation-id.interceptor.ts` - Correlation ID interceptor
- `libs/core/common/decorators/request-id.decorator.ts` - Get request ID decorator

### 8. **File Upload**

#### 8.1. File Upload Utilities
- `libs/core/common/file-upload/file-upload.service.ts` - File upload service
- `libs/core/common/file-upload/file-upload.interface.ts` - File upload interface
- `libs/core/common/file-upload/file-upload.decorator.ts` - File upload decorator
- `libs/core/common/file-upload/file-validator.ts` - File validation

### 9. **Rate Limiting**

#### 9.1. Rate Limiting Guards
- `libs/core/common/guards/rate-limit.guard.ts` - Rate limiting guard
- `libs/core/common/decorators/rate-limit.decorator.ts` - Rate limit decorator

### 10. **Health Checks**

#### 10.1. Health Check Module
- `libs/core/common/health/health.controller.ts` - Health check endpoint
- `libs/core/common/health/health.service.ts` - Health check service
- `libs/core/common/health/health.interface.ts` - Health check interface

### 11. **API Documentation (Swagger/OpenAPI)**

#### 11.1. Swagger Configuration
- `libs/core/common/swagger/swagger.config.ts` - Swagger configuration
- `libs/core/common/swagger/swagger.decorators.ts` - Custom Swagger decorators
- `libs/core/common/swagger/api-response.decorator.ts` - API response decorator

### 12. **Configuration Management**

#### 12.1. Configuration Module
- `libs/core/common/config/config.module.ts` - Configuration module
- `libs/core/common/config/config.service.ts` - Configuration service
- `libs/core/common/config/config.interface.ts` - Configuration interface
- `libs/core/common/config/config.validation.ts` - Configuration validation

### 13. **Metrics & Monitoring**

#### 13.1. Metrics
- `libs/core/common/metrics/metrics.service.ts` - Metrics collection service
- `libs/core/common/metrics/metrics.interceptor.ts` - Metrics interceptor
- `libs/core/common/metrics/metrics.interface.ts` - Metrics interface

### 14. **Utilities**

#### 14.1. Common Utilities
- `libs/core/common/utils/date.utils.ts` - Date utilities
- `libs/core/common/utils/string.utils.ts` - String utilities
- `libs/core/common/utils/object.utils.ts` - Object utilities
- `libs/core/common/utils/uuid.utils.ts` - UUID utilities

#### 14.2. Type Utilities
- `libs/core/common/types/optional.type.ts` - Optional type utilities
- `libs/core/common/types/partial.type.ts` - Partial type utilities
- `libs/core/common/types/deep-partial.type.ts` - Deep partial type

### 15. **Testing Utilities**

#### 15.1. Test Helpers
- `libs/core/common/testing/test-helpers.ts` - Test helper functions
- `libs/core/common/testing/mock-factory.ts` - Mock factory
- `libs/core/common/testing/fixtures.ts` - Test fixtures

### 16. **Domain Patterns**

#### 16.1. Specification Pattern
- `libs/core/domain/specifications/base-specification.ts` - Base specification
- `libs/core/domain/specifications/specification.interface.ts` - Specification interface

#### 16.2. Unit of Work
- `libs/core/infrastructure/persistence/unit-of-work/unit-of-work.interface.ts` - Unit of Work interface
- `libs/core/infrastructure/persistence/unit-of-work/unit-of-work.service.ts` - Unit of Work implementation

### 17. **Message Queue Integration**

#### 17.1. Message Queue Abstractions
- `libs/core/infrastructure/messaging/message-queue.interface.ts` - Message queue interface
- `libs/core/infrastructure/messaging/message-queue.service.ts` - Message queue service
- `libs/core/infrastructure/messaging/message-handler.interface.ts` - Message handler interface

### 18. **Email Service**

#### 18.1. Email Abstractions
- `libs/core/infrastructure/email/email.service.ts` - Email service
- `libs/core/infrastructure/email/email.interface.ts` - Email interface
- `libs/core/infrastructure/email/email-templates.ts` - Email templates

### 19. **Storage Service**

#### 19.1. Storage Abstractions
- `libs/core/infrastructure/storage/storage.service.ts` - Storage service (S3, local, etc.)
- `libs/core/infrastructure/storage/storage.interface.ts` - Storage interface

## 🎯 Ưu Tiên Triển Khai

### Priority 1 (Critical - Cần ngay)
1. Global Exception Filter
2. Response DTOs & Interceptors
3. Pagination DTOs
4. BusinessRuleException (alias)
5. NotFoundException, UnauthorizedException, ForbiddenException

### Priority 2 (Important - Nên có sớm)
6. JWT Authentication & Guards
7. Logging Service
8. Request ID/Correlation ID
9. Validation Pipes
10. Health Checks

### Priority 3 (Nice to have)
11. Rate Limiting
12. File Upload
13. Swagger Configuration
14. Configuration Management
15. Metrics

### Priority 4 (Future enhancements)
16. Specification Pattern
17. Unit of Work
18. Message Queue
19. Email Service
20. Storage Service

## 📝 Notes

- Tất cả các thành phần nên tuân theo Clean Architecture / DDD principles
- Infrastructure layer có thể phụ thuộc vào framework (NestJS)
- Domain và Application layer phải pure TypeScript, không phụ thuộc framework
- Sử dụng Dependency Injection với interfaces (Ports & Adapters pattern)

