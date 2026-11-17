# Table Tennis Analytics

A Next.js foundation for a table tennis management and player analytics application. This first phase establishes the project structure, modern UI system, Prisma/PostgreSQL configuration, and a health-check API endpoint.

## Tech stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod validation
- Lucide React for icons
- ESLint
- npm

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL running locally or in an accessible environment

## Installation

```bash
npm install
```

## PostgreSQL setup

Create a local PostgreSQL database and ensure the service is running:

```sql
CREATE DATABASE table_tennis_db;
```

## Environment configuration

Create a local `.env` file based on the example file:

```bash
cp .env.example .env
```

Then update the value in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/table_tennis_db"
```

The repository includes `.env.example` and ignores `.env` for security.

## Prisma

Generate the Prisma client:

```bash
npm run db:generate
```

Validate the schema:

```bash
npm run db:validate
```

Apply migrations after the database is ready:

```bash
npx prisma migrate dev --name init
```

## Development

```bash
npm run dev
```

Open http://localhost:3000 to view the app.

## Production build

```bash
npm run build
npm run start
```

## Notes

- The home page is a professional landing screen.
- The dashboard page is a placeholder layout foundation for later feature phases.
- The `/api/health` route checks the database connection and returns a 503 if the database is unavailable.
