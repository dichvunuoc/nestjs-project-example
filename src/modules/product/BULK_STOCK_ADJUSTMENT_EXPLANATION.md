# Giải Thích Ví Dụ Logic Phức Tạp: Bulk Stock Adjustment

## 📋 Tổng Quan

Ví dụ này minh họa cách xử lý **điều chỉnh tồn kho hàng loạt** (bulk stock adjustment) cho nhiều sản phẩm cùng lúc, với logic nghiệp vụ phức tạp và tuân thủ nguyên tắc DDD (Domain-Driven Design).

## 🎯 Mục Đích Của Tính Năng

Thay vì điều chỉnh từng sản phẩm một (tốn thời gian), tính năng này cho phép:

- Điều chỉnh tồn kho cho **nhiều sản phẩm cùng lúc** trong một lần gọi API
- Áp dụng các **quy tắc nghiệp vụ** (ví dụ: không vượt quá giới hạn tồn kho tối đa)
- Xử lý **lỗi một phần** (một số sản phẩm thành công, một số thất bại)
- Hỗ trợ **rollback** (hoàn tác) nếu cần thiết

## 📦 Ví Dụ Thực Tế

### Tình Huống:

Bạn là quản lý kho và cần:

1. Tăng tồn kho cho sản phẩm A: +50 (nhập hàng mới)
2. Giảm tồn kho cho sản phẩm B: -10 (hàng hỏng)
3. Tăng tồn kho cho sản phẩm C: +30 (nhập hàng mới)

**Thay vì gọi API 3 lần**, bạn chỉ cần gọi **1 lần** với danh sách tất cả các điều chỉnh.

### Request Example:

```json
POST /products/stock/bulk-adjust
{
  "adjustments": [
    { "productId": "product-A-id", "quantity": 50, "reason": "Nhập hàng mới" },
    { "productId": "product-B-id", "quantity": -10, "reason": "Hàng hỏng" },
    { "productId": "product-C-id", "quantity": 30, "reason": "Nhập hàng mới" }
  ],
  "options": {
    "maxStockLimit": 1000,
    "minStockThreshold": 10,
    "allowPartialSuccess": true,
    "batchReference": "BATCH-2024-001"
  }
}
```

## 🏗️ Kiến Trúc Theo DDD

### 1. **Command** (Application Layer)

**File:** `bulk-stock-adjustment.command.ts`

**Vai trò:** Định nghĩa dữ liệu đầu vào cho operation

**Chứa:**

- `adjustments`: Danh sách các điều chỉnh (mỗi điều chỉnh có productId, quantity, reason)
- `options`: Các tùy chọn như:
  - `maxStockLimit`: Giới hạn tồn kho tối đa
  - `minStockThreshold`: Ngưỡng cảnh báo tồn kho tối thiểu
  - `allowPartialSuccess`: Cho phép một phần thành công hay không
  - `userId`: ID người thực hiện (để audit)
  - `batchReference`: Mã tham chiếu batch

**Validation cơ bản:**

- Phải có ít nhất 1 điều chỉnh
- Không được quá 100 điều chỉnh trong 1 lần
- Mỗi điều chỉnh phải có productId và quantity khác 0

### 2. **Domain Service** (Domain Layer)

**File:** `bulk-stock-adjustment.service.ts`

**Vai trò:** Chứa **TẤT CẢ** business logic phức tạp

**Tại sao cần Domain Service?**

- Logic này không thuộc về một Product cụ thể (cần xử lý nhiều products)
- Cần phối hợp nhiều aggregates (nhiều Product entities)
- Logic nghiệp vụ phức tạp cần tách riêng để dễ test và tái sử dụng

**Các phương thức chính:**

#### a) `validateProducts()`

**Mục đích:** Kiểm tra products có tồn tại và không bị trùng lặp

**Logic:**

```
Với mỗi điều chỉnh:
  - Kiểm tra productId có bị trùng trong batch không?
  - Kiểm tra product có tồn tại trong database không?
  - Nếu không tồn tại → thêm vào danh sách lỗi
```

**Ví dụ:**

- Input: `[{productId: "A", quantity: 10}, {productId: "A", quantity: 20}]`
- Output: Lỗi "Duplicate product ID in batch: A"

#### b) `validateBusinessRules()`

**Mục đích:** Kiểm tra các quy tắc nghiệp vụ (business rules)

**Logic:**

```
Với mỗi product hợp lệ:
  - Tính tồn kho dự kiến = tồn kho hiện tại + số lượng điều chỉnh
  - Nếu có maxStockLimit và tồn kho dự kiến > maxStockLimit:
    → Thêm vào danh sách lỗi
```

**Ví dụ:**

- Product A hiện có: 950 sản phẩm
- Điều chỉnh: +100
- Tồn kho dự kiến: 1050
- maxStockLimit: 1000
- **Kết quả:** Lỗi "Product A would exceed max stock limit"

#### c) `executeAdjustments()`

**Mục đích:** Thực hiện điều chỉnh tồn kho trên các products

**Logic:**

```
Với mỗi product đã validate:
  1. Kiểm tra nếu giảm tồn kho → đảm bảo không âm
     - Nếu tồn kho hiện tại < số lượng muốn giảm → Lỗi
  2. Thực hiện điều chỉnh:
     - Nếu quantity > 0 → gọi product.increaseStock()
     - Nếu quantity < 0 → gọi product.decreaseStock()
  3. Kiểm tra minStockThreshold:
     - Nếu tồn kho mới < minStockThreshold → Thêm cảnh báo
  4. Lưu kết quả (thành công/thất bại)
```

**Ví dụ:**

- Product B hiện có: 5 sản phẩm
- Điều chỉnh: -10
- **Kết quả:** Lỗi "Insufficient stock" (5 < 10)

#### d) `rollbackAdjustments()`

**Mục đích:** Hoàn tác các điều chỉnh đã thực hiện

**Khi nào cần rollback?**

- Khi `allowPartialSuccess = false` và có một số điều chỉnh thất bại
- Khi cần đảm bảo "tất cả hoặc không gì cả" (transaction-like behavior)

**Logic:**

```
Với mỗi điều chỉnh đã thành công:
  - Hoàn tác: làm ngược lại điều chỉnh ban đầu
  - Nếu đã tăng → giảm lại
  - Nếu đã giảm → tăng lại
```

#### e) `processBulkAdjustment()` - Phương thức chính

**Mục đích:** Điều phối toàn bộ quy trình

**Flow:**

```
1. Validate products (kiểm tra tồn tại, không trùng)
   ↓
2. Validate business rules (kiểm tra maxStockLimit)
   ↓
3. Execute adjustments (thực hiện điều chỉnh)
   ↓
4. Kiểm tra có cần rollback không?
   - Nếu allowPartialSuccess = false và có lỗi → cần rollback
   ↓
5. Return kết quả
```

### 3. **Handler** (Application Layer)

**File:** `bulk-stock-adjustment.handler.ts`

**Vai trò:** Chỉ **orchestrate** (điều phối), không chứa business logic

**Trách nhiệm:**

1. **Load products** từ database (repository)
2. **Gọi Domain Service** để xử lý business logic
3. **Save products** sau khi xử lý xong
4. **Handle rollback** nếu cần
5. **Return results** cho client

**Flow trong Handler:**

```
1. Load tất cả products cần thiết từ repository
   ↓
2. Gọi domain service.processBulkAdjustment()
   (Domain service xử lý TẤT CẢ logic phức tạp)
   ↓
3. Kiểm tra shouldRollback
   - Nếu true → rollback và throw error
   ↓
4. Save tất cả products đã điều chỉnh thành công
   ↓
5. Nếu save thất bại → rollback và throw error
   ↓
6. Return kết quả
```

## 🔄 Luồng Xử Lý Chi Tiết

### Scenario 1: Tất Cả Thành Công

```
Request:
- Product A: +50
- Product B: -10
- Product C: +30
- allowPartialSuccess: true

Flow:
1. Handler load 3 products từ database
2. Domain Service validate:
   ✓ Tất cả products tồn tại
   ✓ Không vi phạm maxStockLimit
3. Domain Service execute:
   ✓ Product A: 100 → 150
   ✓ Product B: 50 → 40
   ✓ Product C: 20 → 50
4. Handler save tất cả
5. Return success
```

### Scenario 2: Một Số Thất Bại (Partial Success)

```
Request:
- Product A: +50
- Product B: -100 (nhưng chỉ có 50 trong kho)
- Product C: +30
- allowPartialSuccess: true

Flow:
1. Handler load 3 products
2. Domain Service validate:
   ✓ Tất cả products tồn tại
3. Domain Service execute:
   ✓ Product A: 100 → 150 (thành công)
   ✗ Product B: 50 → -50 (thất bại: không đủ tồn kho)
   ✓ Product C: 20 → 50 (thành công)
4. Handler save Product A và C
5. Return kết quả:
   - successful: 2
   - failed: 1
   - results: [success, error, success]
```

### Scenario 3: Tất Cả Phải Thành Công (Transaction-like)

```
Request:
- Product A: +50
- Product B: -100 (nhưng chỉ có 50 trong kho)
- Product C: +30
- allowPartialSuccess: false  ← Quan trọng!

Flow:
1. Handler load 3 products
2. Domain Service validate:
   ✓ Tất cả products tồn tại
3. Domain Service execute:
   ✓ Product A: 100 → 150 (thành công)
   ✗ Product B: 50 → -50 (thất bại)
   → Phát hiện lỗi, shouldRollback = true
4. Domain Service rollback:
   ↻ Product A: 150 → 100 (hoàn tác)
5. Handler không save gì cả
6. Throw error: "Bulk adjustment failed: 1 adjustments failed"
```

## 🎓 Bài Học Về DDD

### Tại Sao Tách Logic Ra Domain Service?

**Trước khi refactor (SAI):**

```typescript
// Handler chứa TẤT CẢ logic
@CommandHandler(...)
class BulkStockAdjustmentHandler {
  async execute() {
    // 200+ dòng code với validation, business rules, rollback...
    // ❌ Khó test
    // ❌ Khó tái sử dụng
    // ❌ Vi phạm Single Responsibility Principle
  }
}
```

**Sau khi refactor (ĐÚNG):**

```typescript
// Handler chỉ orchestrate
@CommandHandler(...)
class BulkStockAdjustmentHandler {
  async execute() {
    // 1. Load products
    // 2. Gọi domain service
    // 3. Save products
    // ✅ Rõ ràng, dễ hiểu
  }
}

// Domain Service chứa business logic
class BulkStockAdjustmentService {
  // ✅ Pure TypeScript, dễ test
  // ✅ Có thể tái sử dụng
  // ✅ Tuân thủ DDD
}
```

### Lợi Ích:

1. **Separation of Concerns:**
   - Handler: Infrastructure concerns (database, persistence)
   - Domain Service: Business logic

2. **Testability:**
   - Domain Service có thể test độc lập (không cần database)
   - Handler test với mock domain service

3. **Reusability:**
   - Domain Service có thể dùng ở nhiều nơi (không chỉ từ Handler)

4. **Maintainability:**
   - Logic nghiệp vụ tập trung một chỗ
   - Dễ thay đổi business rules

## 📝 Tóm Tắt

1. **Command**: Định nghĩa input (adjustments + options)
2. **Domain Service**: Chứa TẤT CẢ business logic phức tạp
3. **Handler**: Chỉ orchestrate (load, gọi service, save, return)

**Nguyên tắc:** Handler không nên chứa business logic. Business logic phải nằm trong Domain Layer (Domain Service hoặc Entity methods).
