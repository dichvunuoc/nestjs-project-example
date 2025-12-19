# NestJS Project Example

A robust, scalable backend application built with [NestJS](https://nestjs.com/), following Domain-Driven Design (DDD) principles and Clean Architecture. This project utilizes Fastify for high performance, Drizzle ORM for type-safe database interactions, and Redis for caching.

## 🚀 Technologies

- **Framework**: NestJS (with Fastify adapter)
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Cache**: Redis
- **Package Manager**: Bun
- **Logging**: Pino
- **Validation**: Zod & Class Validator

## 🛠 Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (Project uses Bun, but Node is often required for some global tools)
- [Bun](https://bun.sh/) (Package Manager)
- [Docker](https://www.docker.com/) & Docker Compose (For running PostgreSQL and Redis)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nestjs-project-example
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

## ⚙️ Configuration

The application uses environment variables for configuration.

1. **Setup Environment File**
   Copy the example environment file to create your local `.env`.
   ```bash
   cp .env.example .env
   ```

2. **Configure Variables**
   Update `.env` with your specific settings. Key configurations include:

   - **Service**: `PORT`, `NODE_ENV`
   - **Database**: `DATABASE_URL`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - **Redis**: `REDIS_URL`, `REDIS_HOST`
   - **Observability**: `LOG_LEVEL`, `JAEGER_ENDPOINT`

## 🏃 Running the Application

### Infrastructure (Database & Redis)

Start the required infrastructure using Docker Compose:

```bash
docker-compose up -d
```

### Database Migrations

Before running the app, ensure your database schema is up to date:

```bash
# Generate migrations based on schema changes
bun run db:generate

# Apply migrations to the database
bun run db:migrate

# (Optional) Open Drizzle Studio to view data
bun run db:studio
```

### Application

**Development Mode**
```bash
bun run start:dev
```

**Production Mode**
```bash
bun run build
bun run start:prod
```

## 🧪 Testing

The project includes unit, integration, and end-to-end tests.

```bash
# Unit tests
bun run test

# Integration tests
bun run test:integration

# E2E tests
bun run test:e2e

# Test coverage
bun run test:cov
```

## 📂 Project Structure

The project is organized into strictly defined layers:

- **`src/modules`**: Contains feature-specific business logic (Vertical Slices).
- **`src/libs`**: Shared application kernel, utilities, and common infrastructure.
- **`src/main.ts`**: Application entry point.

## 📝 Scripts

| Script | Description |
| :--- | :--- |
| `build` | Compiles the application. |
| `start:dev` | Runs the application in watch mode. |
| `start:prod` | Runs the compiled application. |
| `lint` | Lints the code using ESLint. |
| `format` | Formats code with Prettier. |
| `db:generate` | Generates Drizzle migrations. |
| `db:migrate` | Applies Drizzle migrations. |
