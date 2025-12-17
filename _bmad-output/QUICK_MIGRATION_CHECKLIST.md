# Quick Migration Checklist

## 🚀 Quick Setup (5 phút)

### 1. Copy Core Library

```bash
cp -r libs/core/ /path/to/new-project/libs/core/
```

### 2. Update tsconfig.json

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

### 3. Install Dependencies

```bash
bun add @nestjs/common@^11.0.1 @nestjs/core@^11.0.1 @nestjs/cqrs@^11.0.3 \
  @nestjs/platform-fastify@^11.0.1 drizzle-orm@^0.36.0 pg@^8.13.1 redis@^5.10.0
```

### 4. Setup AppModule

```typescript
import { CoreModule } from '@core/core.module';

@Module({
  imports: [CoreModule],
})
export class AppModule {}
```

### 5. Setup main.ts

```typescript
import { GlobalExceptionFilter, ResponseInterceptor } from '@core/common';

app.useGlobalFilters(new GlobalExceptionFilter());
app.useGlobalInterceptors(new ResponseInterceptor());
```

### 6. Copy Project Context

```bash
mkdir -p _bmad-output
cp _bmad-output/project-context.md /path/to/new-project/_bmad-output/
# Sau đó UPDATE frontmatter trong file này
```

### 7. Copy BMAD Configs (nếu dùng BMAD)

```bash
mkdir -p _bmad/core _bmad/bmm
cp _bmad/core/config.yaml /path/to/new-project/_bmad/core/
cp _bmad/bmm/config.yaml /path/to/new-project/_bmad/bmm/
# Sau đó UPDATE project_name và user_name
```

---

## ✅ Verification

- [ ] `import { AggregateRoot } from '@core/domain'` works
- [ ] `import { CoreModule } from '@core/core.module'` works
- [ ] App starts without errors
- [ ] Project context file exists and is updated
- [ ] BMAD configs updated (if using BMAD)

---

## 📋 Files to Copy

### Required

- ✅ `libs/core/` → Core Library
- ✅ `_bmad-output/project-context.md` → AI Agent Rules

### Optional but Recommended

- ⚠️ `src/database/` → Database Module (if using Drizzle)
- ⚠️ `_bmad/core/config.yaml` → BMAD Core Config
- ⚠️ `_bmad/bmm/config.yaml` → BMAD BMM Config

---

## 🔧 Files to Update

### After Copy

1. `tsconfig.json` - Add path aliases
2. `package.json` - Add dependencies
3. `src/app.module.ts` - Import CoreModule
4. `src/main.ts` - Add filters/interceptors
5. `_bmad-output/project-context.md` - Update frontmatter
6. `_bmad/core/config.yaml` - Update project_name, user_name
7. `_bmad/bmm/config.yaml` - Update project_name

---

## 🎯 Next Steps

1. Create first module following the structure
2. Test CQRS pattern works
3. Verify AI agents can read project-context.md
4. Start building features!

---

_See MIGRATION_GUIDE.md for detailed instructions_
