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

## Super Admin panel (Phase 7)

The admin panel lives at `/admin` and is only available to accounts with the `SUPER_ADMIN` role. Every admin page and `/api/admin/*` endpoint re-checks the role on the server.

1. Apply migrations: `npm run db:migrate`
2. Register a normal account through `/register`.
3. Promote it from a terminal on the server (the role can never be self-assigned in the app):

```bash
npm run admin:promote -- you@example.com
```

4. Sign out and back in. An **Admin panel** link appears in the sidebar.

Promoted accounts are marked as protected system accounts, so other admins cannot suspend, delete or demote them from the panel.

Platform settings (match formats, tournament defaults, ranking minimum, profile fields) are stored in the `SystemSetting` table. `LEADERBOARD_MIN_MATCHES` is only used as the default until settings are saved.

Rate limiting for admin actions and player reports is in-memory (single Node process).

## Tests

```bash
npm test
```
