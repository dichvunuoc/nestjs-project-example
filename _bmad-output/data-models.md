# Data Models Documentation

## Overview

This document describes the database schema and data models used in the NestJS project template. The project uses Drizzle ORM with PostgreSQL and follows DDD (Domain-Driven Design) principles.

## Database Configuration

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM 0.36.0
- **Connection:** Read/Write separation support (can use read replicas)
- **Migration Tool:** Drizzle Kit

## Schema Location

Schema files are located in: `src/modules/*/infrastructure/persistence/drizzle/schema/*.ts`

## Data Models

### Product

**Table Name:** `products`

**Description:** Product aggregate root representing a product in the system. Uses optimistic concurrency control and soft delete.

**Schema Definition:**

```typescript
export const productsTable = pgTable('products', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  priceAmount: decimal('price_amount', { precision: 10, scale: 2 }).notNull(),
  priceCurrency: varchar('price_currency', { length: 3 })
    .notNull()
    .default('USD'),
  stock: integer('stock').notNull().default(0),
  category: varchar('category', { length: 100 }).notNull(),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Fields:**

| Field           | Type          | Constraints             | Description                               |
| --------------- | ------------- | ----------------------- | ----------------------------------------- |
| `id`            | varchar(50)   | PRIMARY KEY             | Product identifier (UUID recommended)     |
| `name`          | varchar(200)  | NOT NULL                | Product name (max 200 characters)         |
| `description`   | varchar(1000) | NULL                    | Product description (max 1000 characters) |
| `priceAmount`   | decimal(10,2) | NOT NULL                | Price amount (precision: 10, scale: 2)    |
| `priceCurrency` | varchar(3)    | NOT NULL, DEFAULT 'USD' | Currency code (ISO 4217, e.g., USD, EUR)  |
| `stock`         | integer       | NOT NULL, DEFAULT 0     | Stock quantity (>= 0)                     |
| `category`      | varchar(100)  | NOT NULL                | Product category (max 100 characters)     |
| `version`       | integer       | NOT NULL, DEFAULT 0     | Optimistic concurrency control version    |
| `isDeleted`     | boolean       | NOT NULL, DEFAULT false | Soft delete flag                          |
| `createdAt`     | timestamp     | NOT NULL, DEFAULT NOW() | Creation timestamp                        |
| `updatedAt`     | timestamp     | NOT NULL, DEFAULT NOW() | Last update timestamp                     |

**Domain Entity:** `Product` (Aggregate Root)

**Location:** `src/modules/product/domain/entities/product.entity.ts`

**Key Features:**

- Aggregate Root with domain events
- Soft delete support (implements `ISoftDeletable`)
- Optimistic concurrency control via `version` field
- Business logic encapsulated in entity methods
- Value Objects: `Price`, `ProductId`

**Business Rules:**

- Product name is required and cannot exceed 200 characters
- Stock cannot be negative
- Category is required
- Price must be positive (enforced by Price value object)
- Cannot modify deleted products

**Domain Events:**

- `ProductCreatedEvent` - Emitted when product is created
- `ProductUpdatedEvent` - Emitted when product is updated
- `ProductDeletedEvent` - Emitted when product is deleted

**Value Objects:**

- `Price` - Represents price with amount and currency
- `ProductId` - Ensures valid product identifier

## CQRS Separation

The project implements CQRS (Command Query Responsibility Segregation) pattern:

### Write Model (Aggregate)

- **Location:** `src/modules/product/domain/entities/product.entity.ts`
- **Repository:** `ProductRepository` (implements `IProductRepository`)
- **Schema:** `productsTable` (Drizzle schema)
- **Purpose:** Source of truth for write operations
- **Features:**
  - Domain events
  - Optimistic concurrency control
  - Business logic validation

### Read Model (Projection)

- **Location:** `src/modules/product/infrastructure/persistence/read/product-read-dao.ts`
- **DAO:** `ProductReadDao` (implements `IProductReadDao`)
- **Purpose:** Optimized for read operations
- **Features:**
  - Can use different database connection (read replica)
  - Returns DTOs optimized for queries
  - No business logic, just data retrieval

## Data Transfer Objects (DTOs)

### ProductDto

**Location:** `src/modules/product/application/dtos/product.dto.ts`

**Purpose:** Used in query responses

```typescript
{
  id: string;
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
  }
  stock: number;
  category: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateProductDto

**Location:** `src/modules/product/application/dtos/create-product.dto.ts`

**Purpose:** Used for creating new products

```typescript
{
  name: string;
  description: string;
  priceAmount: number;
  priceCurrency?: string; // Default: 'USD'
  stock: number;
  category: string;
}
```

### UpdateProductDto

**Location:** `src/modules/product/application/dtos/update-product.dto.ts`

**Purpose:** Used for updating existing products (all fields optional)

```typescript
{
  name?: string;
  description?: string;
  priceAmount?: number;
  priceCurrency?: string;
  stock?: number;
  category?: string;
}
```

### BulkStockAdjustmentDto

**Location:** `src/modules/product/application/dtos/bulk-stock-adjustment.dto.ts`

**Purpose:** Used for bulk stock adjustment operations

```typescript
{
  adjustments: Array<{
    productId: string;
    quantity: number; // Positive for increase, negative for decrease
    reason?: string;
  }>;
  options?: {
    maxStockLimit?: number;
    minStockThreshold?: number;
    allowPartialSuccess?: boolean;
    userId?: string;
    batchReference?: string;
  };
}
```

## Database Migrations

### Generate Migration

```bash
bun run db:generate
```

This command:

- Scans schema files in `src/modules/**/infrastructure/persistence/drizzle/schema/*.ts`
- Generates migration files in `./drizzle` directory
- Creates SQL migration scripts

### Run Migration

```bash
bun run db:migrate
```

This command:

- Executes pending migrations
- Updates database schema

### Database Studio

```bash
bun run db:studio
```

Opens Drizzle Studio for database inspection and querying.

## Read/Write Separation

The project supports separate database connections for read and write operations:

### Write Connection

- **Token:** `DATABASE_WRITE`
- **Usage:** Repositories (write operations)
- **Configuration:** `DB_WRITE_*` environment variables (or fallback to `DB_*`)

### Read Connection

- **Token:** `DATABASE_READ`
- **Usage:** Read DAOs (query operations)
- **Configuration:** `DB_READ_*` environment variables (or fallback to `DB_*`)

**Benefits:**

- Can use read replicas for scaling read operations
- Load distribution between primary and replicas
- High availability (read operations continue if primary fails)
- Aligns with CQRS pattern

## Constraints and Validations

### Database Level

- Primary key on `id`
- NOT NULL constraints on required fields
- Default values for optional fields
- Check constraints (enforced by application layer)

### Application Level

- Domain entity validations (in `Product` aggregate)
- DTO validations (planned - see MISSING_COMPONENTS.md)
- Business rule validations (in domain services)

### Domain Level

- Value object validations (Price, ProductId)
- Aggregate invariants (name length, stock >= 0, etc.)

## Indexes

Currently, no explicit indexes are defined. Recommended indexes:

- `idx_products_category` on `category` (for filtering)
- `idx_products_is_deleted` on `isDeleted` (for soft delete queries)
- `idx_products_created_at` on `createdAt` (for sorting)

## Relationships

Currently, the Product model has no relationships. Future modules may add:

- Product reviews
- Product images
- Product variants
- Order items (references to products)

## Notes

- All timestamps use PostgreSQL `timestamp` type (timezone-aware)
- Soft delete is implemented via `isDeleted` flag (not actual deletion)
- Optimistic concurrency control prevents lost updates
- Version field is incremented on each update
- Price is stored as decimal to avoid floating-point precision issues
- Currency codes follow ISO 4217 standard (3 characters)
