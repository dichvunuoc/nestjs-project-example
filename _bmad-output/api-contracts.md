# API Contracts Documentation

## Overview

This document describes all API endpoints available in the NestJS project template. The project follows RESTful conventions and uses CQRS pattern for command/query separation.

## Base URL

All endpoints are relative to the base URL (default: `http://localhost:3000`)

## Authentication

Currently, the project template does not include authentication. This is a planned feature (see MISSING_COMPONENTS.md).

## API Endpoints

### Product Module

Base path: `/products`

#### 1. Create Product

**Endpoint:** `POST /products`

**Description:** Creates a new product

**Request Body:**

```json
{
  "name": "string (required, max 200 chars)",
  "description": "string (optional, max 1000 chars)",
  "priceAmount": "number (required)",
  "priceCurrency": "string (optional, default: 'USD')",
  "stock": "number (required, >= 0)",
  "category": "string (required, max 100 chars)"
}
```

**Response:** `201 Created`

```json
{
  "id": "string"
}
```

**Example:**

```bash
POST /products
Content-Type: application/json

{
  "name": "Laptop",
  "description": "High performance laptop",
  "priceAmount": 999.99,
  "priceCurrency": "USD",
  "stock": 10,
  "category": "Electronics"
}
```

#### 2. Get Product by ID

**Endpoint:** `GET /products/:id`

**Description:** Retrieves a single product by its ID

**Path Parameters:**

- `id` (string, required): Product identifier

**Response:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "price": {
    "amount": "number",
    "currency": "string"
  },
  "stock": "number",
  "category": "string",
  "version": "number",
  "createdAt": "ISO 8601 date string",
  "updatedAt": "ISO 8601 date string"
}
```

**Example:**

```bash
GET /products/123e4567-e89b-12d3-a456-426614174000
```

#### 3. Get Product List

**Endpoint:** `GET /products`

**Description:** Retrieves a paginated list of products with optional filtering

**Query Parameters:**

- `page` (number, optional, default: 1): Page number
- `limit` (number, optional, default: 10): Items per page
- `category` (string, optional): Filter by category
- `search` (string, optional): Search term

**Response:** `200 OK`

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "price": {
      "amount": "number",
      "currency": "string"
    },
    "stock": "number",
    "category": "string",
    "version": "number",
    "createdAt": "ISO 8601 date string",
    "updatedAt": "ISO 8601 date string"
  }
]
```

**Example:**

```bash
GET /products?page=1&limit=10&category=Electronics&search=laptop
```

#### 4. Update Product

**Endpoint:** `PUT /products/:id`

**Description:** Updates an existing product

**Path Parameters:**

- `id` (string, required): Product identifier

**Request Body:**

```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "priceAmount": "number (optional)",
  "priceCurrency": "string (optional)",
  "stock": "number (optional)",
  "category": "string (optional)"
}
```

**Response:** `200 OK` (no body)

**Example:**

```bash
PUT /products/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "name": "Updated Laptop",
  "priceAmount": 899.99
}
```

#### 5. Delete Product

**Endpoint:** `DELETE /products/:id`

**Description:** Soft deletes a product (marks as deleted, doesn't remove from database)

**Path Parameters:**

- `id` (string, required): Product identifier

**Response:** `204 No Content`

**Example:**

```bash
DELETE /products/123e4567-e89b-12d3-a456-426614174000
```

#### 6. Increase Stock

**Endpoint:** `POST /products/:id/stock/increase`

**Description:** Increases the stock quantity for a product

**Path Parameters:**

- `id` (string, required): Product identifier

**Request Body:**

```json
{
  "quantity": "number (required, > 0)"
}
```

**Response:** `200 OK` (no body)

**Example:**

```bash
POST /products/123e4567-e89b-12d3-a456-426614174000/stock/increase
Content-Type: application/json

{
  "quantity": 5
}
```

#### 7. Decrease Stock

**Endpoint:** `POST /products/:id/stock/decrease`

**Description:** Decreases the stock quantity for a product

**Path Parameters:**

- `id` (string, required): Product identifier

**Request Body:**

```json
{
  "quantity": "number (required, > 0)"
}
```

**Response:** `200 OK` (no body)

**Example:**

```bash
POST /products/123e4567-e89b-12d3-a456-426614174000/stock/decrease
Content-Type: application/json

{
  "quantity": 3
}
```

#### 8. Bulk Stock Adjustment

**Endpoint:** `POST /products/stock/bulk-adjust`

**Description:** Adjusts stock for multiple products in a single operation. Supports complex business logic with validation, partial success handling, and rollback capabilities.

**Request Body:**

```json
{
  "adjustments": [
    {
      "productId": "string (required)",
      "quantity": "number (required, positive for increase, negative for decrease)",
      "reason": "string (optional)"
    }
  ],
  "options": {
    "maxStockLimit": "number (optional)",
    "minStockThreshold": "number (optional)",
    "allowPartialSuccess": "boolean (optional, default: true)",
    "userId": "string (optional)",
    "batchReference": "string (optional)"
  }
}
```

**Response:** `200 OK`

```json
{
  "totalRequested": "number",
  "successful": "number",
  "failed": "number",
  "results": [
    {
      "productId": "string",
      "success": "boolean",
      "previousStock": "number",
      "newStock": "number",
      "quantity": "number",
      "error": "string (optional)",
      "warning": "string (optional)"
    }
  ],
  "warnings": ["string"]
}
```

**Example:**

```bash
POST /products/stock/bulk-adjust
Content-Type: application/json

{
  "adjustments": [
    {
      "productId": "id1",
      "quantity": 10,
      "reason": "Restock"
    },
    {
      "productId": "id2",
      "quantity": -5,
      "reason": "Damaged"
    }
  ],
  "options": {
    "maxStockLimit": 1000,
    "minStockThreshold": 10,
    "allowPartialSuccess": true,
    "batchReference": "BATCH-2024-001"
  }
}
```

**Business Logic:**

- Validates all products exist and are not duplicated in batch
- Validates business rules (max stock limit, sufficient stock for decreases)
- Supports partial success (some adjustments succeed, some fail)
- Supports transaction-like behavior (all or nothing when `allowPartialSuccess: false`)
- Provides detailed reporting for each adjustment

### Health Check Module

Base path: `/health`

#### 1. Overall Health Check

**Endpoint:** `GET /health`

**Description:** Returns detailed health status of all registered indicators (database, redis, etc.)

**Response:** `200 OK`

```json
{
  "status": "up" | "down" | "degraded",
  "timestamp": "ISO 8601 date string",
  "uptime": "number (seconds)",
  "checks": {
    "database": {
      "status": "up" | "down",
      "message": "string",
      "responseTime": "string",
      "timestamp": "ISO 8601 date string"
    },
    "redis": {
      "status": "up" | "down" | "degraded",
      "message": "string",
      "responseTime": "string",
      "timestamp": "ISO 8601 date string"
    }
  }
}
```

#### 2. Liveness Probe

**Endpoint:** `GET /health/live`

**Description:** Simple check to verify the application is running (always returns 200 if service is alive)

**Response:** `200 OK`

```json
{
  "status": "alive",
  "timestamp": "ISO 8601 date string"
}
```

#### 3. Readiness Probe

**Endpoint:** `GET /health/ready`

**Description:** Checks if the application is ready to serve traffic (checks dependencies)

**Response:** `200 OK` (if ready) or `503 Service Unavailable` (if not ready)

Same response format as `/health` endpoint.

## Error Responses

Currently, the project uses standard NestJS exception handling. A global exception filter is planned (see MISSING_COMPONENTS.md).

**Standard Error Format:**

```json
{
  "statusCode": "number",
  "message": "string | string[]",
  "error": "string"
}
```

## CQRS Pattern

All endpoints follow CQRS (Command Query Responsibility Segregation) pattern:

- **Commands** (Write operations): POST, PUT, DELETE endpoints
  - Use `CommandBus` to execute commands
  - Mutate state via Aggregate Roots
  - Return minimal data (usually just ID or void)

- **Queries** (Read operations): GET endpoints
  - Use `QueryBus` to execute queries
  - Return DTOs from Read Models
  - No side effects

## Notes

- All timestamps are in ISO 8601 format
- Product IDs are strings (UUIDs recommended)
- Stock quantities are integers (>= 0)
- Price amounts are decimals (precision: 10, scale: 2)
- Version field is used for optimistic concurrency control
- Products use soft delete (isDeleted flag) rather than hard delete
