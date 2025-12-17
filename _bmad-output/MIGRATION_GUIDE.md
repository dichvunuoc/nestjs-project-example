# Hướng Dẫn Áp Dụng Core Architecture Sang Project NestJS Khác

## 📋 Tổng Quan

Tài liệu này hướng dẫn cách copy và setup Core Architecture từ project này sang một NestJS project khác để AI agents có thể xây dựng code theo chuẩn DDD/CQRS.

---

## 🎯 Các Thành Phần Cần Copy

### 1. Core Library (`libs/core/`) - BẮT BUỘC

**Thành phần quan trọng nhất** - Cung cấp foundation cho DDD/CQRS pattern.

```
libs/core/
├── domain/              # Domain Layer (Pure TypeScript)
├── application/         # Application Layer (Pure TypeScript)
├── infrastructure/      # Infrastructure Layer
├── common/              # Common Utilities
├── core.module.ts       # Core Module
├── decorators/          # Custom decorators
└── index.ts             # Public exports
```

**Cách copy:**

```bash
# Từ project hiện tại
cp -r libs/core/ /path/to/new-project/libs/core/
```

### 2. Project Context File - BẮT BUỘC cho BMAD

**File này giúp AI agents hiểu rules và patterns của project.**

```
_bmad-output/project-context.md
```

**Cách copy:**

```bash
# Copy vào project mới
cp _bmad-output/project-context.md /path/to/new-project/_bmad-output/project-context.md
```

**Sau đó CẦN customize:**

- Update `project_name` trong frontmatter
- Update `user_name` nếu khác
- Review và update technology stack nếu project mới dùng versions khác
- Adjust patterns nếu project có requirements đặc biệt

### 3. Database Module Structure (Tùy chọn nhưng khuyến nghị)

**Nếu project mới cũng dùng Drizzle ORM với read/write separation:**

```
src/database/
├── database.module.ts
├── database.provider.ts
├── database.service.ts
├── database.type.ts
└── README.md
```

**Cách copy:**

```bash
# Copy database module
cp -r src/database/ /path/to/new-project/src/database/
```

### 4. BMAD Configuration Files (Nếu project mới dùng BMAD)

**Các file config cho BMAD method:**

```
_bmad/
├── core/
│   └── config.yaml          # Core config
└── bmm/
    └── config.yaml          # BMM module config
```

**Cách copy:**

```bash
# Copy BMAD configs
cp -r _bmad/core/config.yaml /path/to/new-project/_bmad/core/config.yaml
cp -r _bmad/bmm/config.yaml /path/to/new-project/_bmad/bmm/config.yaml
```

**Sau đó CẦN update:**

- `project_name` trong config files
- `user_name` nếu khác
- `output_folder` path nếu khác

---

## 🚀 Setup Steps Cho Project Mới

### Step 1: Copy Core Library

```bash
# Từ project template
cd /path/to/new-project
cp -r /path/to/template-project/libs/core/ ./libs/core/
```

### Step 2: Cấu Hình TypeScript Paths

**Update `tsconfig.json` trong project mới:**

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@core/*": ["libs/core/*"],
      "@modules/*": ["src/modules/*"]
    }
  }
}
```

### Step 3: Cài Đặt Dependencies

**Đảm bảo các dependencies sau có trong `package.json`:**

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/cqrs": "^11.0.3",
    "@nestjs/platform-fastify": "^11.0.1",
    "@nestjs/config": "^4.0.2",
    "drizzle-orm": "^0.36.0",
    "pg": "^8.13.1",
    "redis": "^5.10.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/node": "^22.10.7",
    "@types/pg": "^8.11.10",
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.7.3"
  }
}
```

**Cài đặt:**

```bash
bun install  # hoặc npm install / yarn install
```

### Step 4: Setup CoreModule trong AppModule

**Update `src/app.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
// Import DatabaseModule nếu đã copy
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    CoreModule, // BẮT BUỘC - Cung cấp CQRS buses
    DatabaseModule, // Nếu đã copy database module
    // ... other modules
  ],
})
export class AppModule {}
```

### Step 5: Setup Global Filters & Interceptors

**Update `src/main.ts`:**

```typescript
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, ResponseInterceptor } from '@core/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(3000);
}
bootstrap();
```

### Step 6: Copy và Customize Project Context

**Copy project-context.md:**

```bash
# Tạo thư mục _bmad-output nếu chưa có
mkdir -p _bmad-output

# Copy file
cp /path/to/template-project/_bmad-output/project-context.md ./_bmad-output/project-context.md
```

**Update frontmatter trong `_bmad-output/project-context.md`:**

```yaml
---
project_name: 'your-new-project-name' # ← UPDATE
user_name: 'YourName' # ← UPDATE
date: '2025-12-17T15:50:28.000Z' # ← UPDATE với date hiện tại
# ... rest of frontmatter
---
```

**Review và update các sections:**

- Technology Stack & Versions - Update nếu project dùng versions khác
- Architecture Patterns - Giữ nguyên nếu dùng cùng pattern
- Naming Conventions - Adjust nếu có conventions khác
- Critical Rules - Review và update nếu cần

### Step 7: Setup BMAD Config (Nếu dùng BMAD)

**Copy BMAD configs:**

```bash
# Tạo thư mục _bmad nếu chưa có
mkdir -p _bmad/core _bmad/bmm

# Copy configs
cp /path/to/template-project/_bmad/core/config.yaml ./_bmad/core/config.yaml
cp /path/to/template-project/_bmad/bmm/config.yaml ./_bmad/bmm/config.yaml
```

**Update `_bmad/core/config.yaml`:**

```yaml
user_name: YourName # ← UPDATE
communication_language: Vietnamese # ← UPDATE nếu khác
document_output_language: Vietnamese # ← UPDATE nếu khác
output_folder: '{project-root}/_bmad-output'
bmad_memory: '{project-root}/_bmad/_memory'
```

**Update `_bmad/bmm/config.yaml`:**

```yaml
project_name: your-new-project-name # ← UPDATE
user_skill_level: intermediate # ← UPDATE nếu khác
planning_artifacts: '{project-root}/_bmad-output/project-planning-artifacts'
implementation_artifacts: '{project-root}/_bmad-output/implementation-artifacts'
project_knowledge: '{project-root}/docs'
```

---

## 📝 Tạo Module Mới Theo Chuẩn

Sau khi setup xong, tạo module mới theo cấu trúc chuẩn:

### Cấu Trúc Module

```
src/modules/{module-name}/
├── domain/
│   ├── entities/              # Aggregate Roots
│   ├── value-objects/         # Value Objects
│   ├── events/                # Domain Events
│   ├── repositories/          # Repository Interfaces
│   └── services/              # Domain Services
├── application/
│   ├── commands/
│   │   ├── handlers/
│   │   └── index.ts
│   ├── queries/
│   │   ├── handlers/
│   │   ├── ports/             # Read DAO Interfaces
│   │   └── index.ts
│   └── dtos/
├── infrastructure/
│   ├── http/                  # Controllers
│   └── persistence/
│       ├── drizzle/schema/    # Drizzle schemas
│       ├── write/             # Repository implementations
│       └── read/              # Read DAO implementations
└── {module-name}.module.ts
```

### Example: Tạo User Module

**1. Domain Layer:**

```typescript
// src/modules/user/domain/entities/user.entity.ts
import { AggregateRoot } from '@core/domain';

export class User extends AggregateRoot {
  // ...
}
```

**2. Application Layer:**

```typescript
// src/modules/user/application/commands/create-user.command.ts
import { ICommand } from '@core/application';

export class CreateUserCommand implements ICommand {
  // ...
}
```

**3. Infrastructure Layer:**

```typescript
// src/modules/user/infrastructure/http/user.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { COMMAND_BUS_TOKEN } from '@core/core.module';
import { Inject } from '@nestjs/common';
import type { ICommandBus } from '@core/application';

@Controller('users')
export class UserController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<string> {
    const command = new CreateUserCommand(/* ... */);
    return await this.commandBus.execute(command);
  }
}
```

**4. Register Module:**

```typescript
// src/modules/user/user.module.ts
import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { UserController } from './infrastructure/http';
import { CreateUserHandler } from './application/commands/handlers';

@Module({
  imports: [CoreModule],
  controllers: [UserController],
  providers: [
    CreateUserHandler,
    // ... other providers
  ],
})
export class UserModule {}
```

---

## ✅ Checklist Setup Hoàn Chỉnh

### Core Library Setup

- [ ] Copy `libs/core/` vào project mới
- [ ] Cấu hình TypeScript paths (`@core/*`)
- [ ] Cài đặt tất cả dependencies
- [ ] Import `CoreModule` trong `AppModule`
- [ ] Setup `GlobalExceptionFilter` và `ResponseInterceptor` trong `main.ts`

### Database Setup (Nếu copy)

- [ ] Copy `src/database/` vào project mới
- [ ] Cấu hình environment variables cho database
- [ ] Import `DatabaseModule` trong `AppModule`
- [ ] Test database connection

### Project Context Setup

- [ ] Copy `project-context.md` vào `_bmad-output/`
- [ ] Update frontmatter (project_name, user_name, date)
- [ ] Review và update technology stack
- [ ] Review và update critical rules nếu cần

### BMAD Setup (Nếu dùng BMAD)

- [ ] Copy BMAD config files
- [ ] Update `project_name` trong configs
- [ ] Update `user_name` trong configs
- [ ] Test BMAD master agent activation

### Testing Setup

- [ ] Tạo một module test theo chuẩn
- [ ] Verify CQRS pattern hoạt động
- [ ] Test repository và Read DAO
- [ ] Test domain events publishing

---

## 🔍 Verification Steps

### 1. Verify Core Library Import

```typescript
// Test file: src/test-core.ts
import { AggregateRoot } from '@core/domain';
import { ICommandBus } from '@core/application';
import { CoreModule } from '@core/core.module';

// Nếu compile không lỗi → OK
```

### 2. Verify CQRS Buses

```typescript
// Trong một handler
import { COMMAND_BUS_TOKEN } from '@core/core.module';
import { Inject } from '@nestjs/common';

@Injectable()
export class TestHandler {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  ) {}

  // Nếu inject thành công → OK
}
```

### 3. Verify Project Context

```bash
# Kiểm tra file tồn tại
ls _bmad-output/project-context.md

# Kiểm tra frontmatter
head -20 _bmad-output/project-context.md
```

---

## 🎯 Lợi Ích Sau Khi Setup

1. **Consistency**: Tất cả modules follow cùng một pattern
2. **Productivity**: Giảm boilerplate code, focus vào business logic
3. **Quality**: Standardized error handling, response format
4. **AI Agent Support**: Agents có thể implement code đúng chuẩn nhờ project-context.md
5. **Maintainability**: Code dễ maintain và extend

---

## 📚 Tài Liệu Tham Khảo

- `CORE_ARCHITECTURE_GUIDE.md` - Chi tiết về Core Architecture
- `_bmad-output/project-context.md` - Rules và patterns cho AI agents
- `ARCHITECTURE_ANALYSIS.md` - Phân tích kiến trúc chi tiết
- `README-ARCHITECTURE.md` - Tổng quan về architecture

---

## ⚠️ Lưu Ý Quan Trọng

1. **Core Library là độc lập**: Không import từ `src/modules` trong `libs/core/`
2. **Dependency Rules**: Tuân thủ nghiêm ngặt dependency rules giữa các layers
3. **Project Context**: Luôn update khi technology stack hoặc patterns thay đổi
4. **Testing**: Test kỹ sau khi setup để đảm bảo mọi thứ hoạt động
5. **Customization**: Adjust patterns nếu project có requirements đặc biệt

---

_Last Updated: 2025-12-17_
_Created for: nestjs-project-example → New NestJS Project Migration_
