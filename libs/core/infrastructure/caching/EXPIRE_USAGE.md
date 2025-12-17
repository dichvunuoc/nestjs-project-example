# Cách sử dụng hàm `expire()` trong RedisCacheService

## Mục đích
Hàm `expire()` được sử dụng để thiết lập hoặc cập nhật thời gian sống (TTL - Time To Live) cho một key đã tồn tại trong Redis.

## Signature
```typescript
async expire(key: string, seconds: number): Promise<boolean>
```

## Parameters
- `key: string` - Key cần thiết lập TTL (không bao gồm prefix, sẽ được tự động thêm)
- `seconds: number` - Thời gian sống tính bằng giây

## Return Value
- `Promise<boolean>` - `true` nếu thiết lập thành công, `false` nếu key không tồn tại hoặc có lỗi

## Các trường hợp sử dụng

### 1. Gia hạn thời gian sống cho key đã tồn tại
```typescript
import { RedisCacheService } from '@core/infrastructure/caching';

// Inject service
constructor(private readonly cacheService: RedisCacheService) {}

// Set một giá trị
await this.cacheService.set('user:123', { name: 'John' }, 60); // TTL 60 giây

// Sau 30 giây, bạn muốn gia hạn thêm 120 giây
const extended = await this.cacheService.expire('user:123', 120);
if (extended) {
  console.log('TTL đã được gia hạn thành công');
}
```

### 2. Kiểm tra và gia hạn key nếu còn tồn tại
```typescript
// Kiểm tra key có tồn tại không
const exists = await this.cacheService.exists('session:abc123');
if (exists) {
  // Gia hạn session thêm 30 phút (1800 giây)
  await this.cacheService.expire('session:abc123', 1800);
}
```

### 3. Sử dụng trong service để quản lý cache động
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly cacheService: RedisCacheService,
  ) {}

  async getUserActivity(userId: string) {
    const cacheKey = `user:activity:${userId}`;
    
    // Lấy dữ liệu từ cache
    let activity = await this.cacheService.get(cacheKey);
    
    if (!activity) {
      // Nếu không có trong cache, lấy từ database
      activity = await this.fetchFromDatabase(userId);
      // Cache với TTL 5 phút
      await this.cacheService.set(cacheKey, activity, 300);
    } else {
      // Nếu có trong cache, gia hạn thêm 5 phút mỗi lần truy cập
      await this.cacheService.expire(cacheKey, 300);
    }
    
    return activity;
  }
}
```

### 4. Quản lý session timeout
```typescript
@Injectable()
export class SessionService {
  constructor(
    private readonly cacheService: RedisCacheService,
  ) {}

  async refreshSession(sessionId: string): Promise<boolean> {
    const sessionKey = `session:${sessionId}`;
    
    // Kiểm tra session có tồn tại không
    const exists = await this.cacheService.exists(sessionKey);
    if (!exists) {
      return false; // Session đã hết hạn
    }
    
    // Gia hạn session thêm 1 giờ
    return await this.cacheService.expire(sessionKey, 3600);
  }
}
```

## So sánh với các phương thức khác

### `set()` với TTL
```typescript
// set() - Thiết lập giá trị và TTL cùng lúc
await cacheService.set('key', value, 60); // Set value + TTL 60s
```

### `expire()` - Chỉ thiết lập TTL
```typescript
// expire() - Chỉ thiết lập TTL cho key đã tồn tại
await cacheService.set('key', value); // Set value không có TTL
await cacheService.expire('key', 60); // Sau đó mới set TTL
```

## Lưu ý quan trọng

1. **Key phải tồn tại**: `expire()` chỉ hoạt động với key đã tồn tại trong Redis. Nếu key không tồn tại, hàm sẽ trả về `false`.

2. **Prefix tự động**: Key sẽ được tự động thêm prefix nếu đã cấu hình trong `CacheOptions`.

3. **Giá trị seconds**: 
   - `> 0`: Thiết lập TTL
   - `= 0`: Xóa key ngay lập tức (tương đương `delete()`)
   - `< 0`: Không hợp lệ

4. **Error handling**: Hàm sẽ log lỗi và trả về `false` nếu có exception, không throw error.

## Ví dụ thực tế: Cache với auto-refresh

```typescript
@Injectable()
export class ProductService {
  constructor(
    private readonly cacheService: RedisCacheService,
  ) {}

  async getProduct(productId: string) {
    const cacheKey = `product:${productId}`;
    
    // Lấy từ cache
    let product = await this.cacheService.get(cacheKey);
    
    if (product) {
      // Nếu có trong cache, gia hạn TTL (sliding expiration)
      await this.cacheService.expire(cacheKey, 3600); // Gia hạn 1 giờ
      return product;
    }
    
    // Nếu không có, lấy từ database
    product = await this.productRepository.findById(productId);
    
    // Cache với TTL 1 giờ
    await this.cacheService.set(cacheKey, product, 3600);
    
    return product;
  }
}
```

## Kết luận
Hàm `expire()` rất hữu ích khi bạn cần:
- Gia hạn thời gian sống của key đã tồn tại
- Implement sliding expiration pattern
- Quản lý session timeout động
- Refresh TTL khi có activity trên key

