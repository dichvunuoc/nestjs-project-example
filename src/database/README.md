# Database Module - Read/Write Separation

Module này cung cấp 2 database connections riêng biệt cho CQRS pattern:
- **DATABASE_WRITE**: Cho write operations (repositories)
- **DATABASE_READ**: Cho read operations (read DAOs)

## Cấu hình mặc định

Mặc định, cả 2 connections sẽ dùng cùng một Pool và database:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=nestjs_project
```

## Cấu hình tách biệt Read/Write

Để tách biệt hoàn toàn read và write connections (ví dụ: dùng read replica), cấu hình như sau:

### Write Connection (Primary Database)
```env
DB_WRITE_HOST=primary-db.example.com
DB_WRITE_PORT=5432
DB_WRITE_USER=postgres
DB_WRITE_PASSWORD=write_password
DB_WRITE_NAME=nestjs_project
```

### Read Connection (Read Replica)
```env
DB_READ_HOST=replica-db.example.com
DB_READ_PORT=5432
DB_READ_USER=postgres
DB_READ_PASSWORD=read_password
DB_READ_NAME=nestjs_project
```

## Cách sử dụng

### Trong Repository (Write Operations)

```typescript
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ProductRepository {
  constructor(
    @Inject('DATABASE_WRITE') private readonly db: NodePgDatabase,
  ) {}
  
  async save(product: Product) {
    // Write operations sử dụng DATABASE_WRITE
    await this.db.insert(productsTable).values(...);
  }
}
```

### Trong Read DAO (Read Operations)

```typescript
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ProductReadDao {
  constructor(
    @Inject('DATABASE_READ') private readonly db: NodePgDatabase,
  ) {}
  
  async findById(id: string) {
    // Read operations sử dụng DATABASE_READ
    return this.db.select().from(productsTable).where(...);
  }
}
```

## Backward Compatibility

Token `DATABASE` vẫn được export và alias cho `DATABASE_WRITE` để đảm bảo backward compatibility với code cũ.

## Lợi ích

1. **Scale Read Operations**: Có thể scale read operations độc lập bằng cách thêm read replicas
2. **Load Distribution**: Phân tán load giữa primary và replicas
3. **High Availability**: Read operations vẫn hoạt động nếu primary database có vấn đề
4. **CQRS Pattern**: Phù hợp với CQRS pattern - tách biệt write và read models

## Lưu ý

- Nếu chỉ config một trong hai (write hoặc read), connection còn lại sẽ fallback về default config
- Cả 2 connections đều sử dụng cùng schema definition
- Write connection là source of truth, read connection có thể có replication lag




