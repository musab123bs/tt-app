
# PHASE 01 — TABLE TENNIS APP: PROJECT FOUNDATION

## 1. Project Overview

Build the technical foundation of a Table Tennis Management & Player Analytics application.

The application will allow individual players to register, manage profiles, record table tennis matches, track scores, and analyze their performance.

This phase is strictly about establishing a clean, scalable, production-ready project foundation.

Do NOT implement authentication, player profiles, match management, scoring, or analytics in this phase. Those belong to later phases.

## 2. Technology Stack

Use the following technologies:

- Next.js with App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod for validation
- Lucide React for icons
- ESLint
- npm as package manager

Use stable, mutually compatible versions.

Do not introduce unnecessary libraries or dependencies.

## 3. Initial Project Inspection

Before making changes:

1. Inspect the existing project structure.
2. Check the installed dependencies and versions.
3. Check whether Next.js is already configured.
4. Check whether Tailwind CSS is already configured.
5. Check whether Prisma or PostgreSQL configuration already exists.
6. Identify existing reusable components and configurations.

IMPORTANT:
- Do not overwrite an existing working project.
- Do not unnecessarily reinstall dependencies.
- Preserve existing configurations wherever possible.
- If the repository is empty, initialize the project using the specified stack.

## 4. Project Architecture

Establish a modular folder structure.

Recommended structure:

```text
src/
├── app/
│   ├── (public)/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── api/
│   │   └── health/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── globals.css
│   └── not-found.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── lib/
│   ├── prisma.ts
│   ├── utils.ts
│   └── validations/
│
├── config/
│   └── site.ts
│
├── types/
│   └── index.ts
│
└── generated/
    └── prisma/

prisma/
├── schema.prisma
└── migrations/

public/
└── images/

.env.example
.gitignore
README.md
```

Adjust the structure if the existing repository requires a different approach.

Do not create unnecessary empty files.

## 5. Database Configuration

Configure PostgreSQL using Prisma.

Requirements:

- Create a Prisma schema.
- Configure the PostgreSQL datasource.
- Use environment variables for database configuration.
- Create a reusable Prisma client singleton.
- Prevent multiple Prisma client instances during development hot reload.
- Keep database access server-side.
- Do not expose database credentials to client components.

Create a minimal initial database schema.

For this phase, only establish the database connection and any essential foundation models.

Do not prematurely implement the complete match or statistics schema.

Use an appropriate Prisma generator configuration for the installed Prisma version.

## 6. Environment Variables

Create `.env.example`.

Include:

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/table_tennis_db"

Do not commit actual credentials.

Add `.env` to `.gitignore`.

Document how to configure the local PostgreSQL database.

## 7. UI Foundation

Establish a premium, modern sports application design system.

### Design direction

- Clean and professional interface.
- Light theme as the default.
- Primary color: Blue (#0B82FF).
- White backgrounds.
- Neutral gray surfaces.
- Dark text.
- Subtle borders.
- Consistent spacing.
- Rounded cards.
- Minimal shadows.
- Avoid unnecessary gradients.
- Avoid excessive animations.

### Typography

Use a modern, readable font.

Maintain consistent typography scales for:

- Page headings.
- Section headings.
- Body text.
- Labels.
- Supporting text.

### Responsive behavior

The application must support:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

Use responsive Tailwind utilities.

## 8. Initial Application Pages

Create only the foundation pages.

### Home Page (/)

Build a simple professional landing page introducing the application.

Include:

- Application name: Table Tennis Analytics.
- Short description.
- Hero section.
- Primary call-to-action.
- Feature overview.
- Footer.

Do not create fake user testimonials or fabricated statistics.

### Dashboard Placeholder (/dashboard)

Create a basic dashboard layout placeholder.

Include:

- Sidebar navigation.
- Top navigation bar.
- Main content area.
- Welcome heading.
- Placeholder cards.

This is only a layout foundation.

Do not implement real player statistics or authentication.

Do not display fabricated match records.

## 9. Reusable UI Components

Create reusable components where appropriate.

Examples:

- Button
- Card
- Input
- Badge
- Container
- PageHeader
- Sidebar
- Topbar

Follow consistent component conventions.

Avoid creating a separate component for every small element.

## 10. API Foundation

Create:

GET /api/health

The endpoint should return:

{
  "success": true,
  "message": "Table Tennis API is running"
}

Also verify the database connection through an appropriate server-side health check.

Return a suitable HTTP error status if the database is unavailable.

Never expose database credentials or internal error details.

## 11. Code Quality Requirements

- Use TypeScript properly.
- Avoid unnecessary use of `any`.
- Use reusable utilities.
- Follow Next.js App Router conventions.
- Use Server Components by default.
- Use Client Components only when necessary.
- Keep database logic out of UI components.
- Keep environment variables secure.
- Add appropriate error handling.
- Follow consistent naming conventions.
- Avoid duplicated code.
- Avoid hardcoded credentials.
- Keep code readable and maintainable.

## 12. Documentation

Create a useful README.md containing:

1. Project overview.
2. Technology stack.
3. Prerequisites.
4. Installation instructions.
5. PostgreSQL setup.
6. Environment variable configuration.
7. Prisma setup.
8. Database migration commands.
9. Development server command.
10. Build and production commands.

Include exact commands that work with the installed dependencies.

## 13. Validation & Testing

After implementation:

- Run ESLint.
- Run TypeScript checks.
- Run Prisma validation.
- Verify the PostgreSQL connection if credentials are configured.
- Run the production build.
- Test the home page.
- Test the dashboard placeholder.
- Test the API health endpoint.

Fix all errors before declaring completion.

Do not claim that database connectivity works if no valid database connection was tested.

## 14. Phase Completion Criteria

Phase 1 is complete only when:

- [ ] Next.js application runs successfully.
- [ ] TypeScript is configured.
- [ ] Tailwind CSS works.
- [ ] PostgreSQL configuration is established.
- [ ] Prisma is configured.
- [ ] Prisma client is reusable.
- [ ] Environment example file exists.
- [ ] Home page is responsive.
- [ ] Dashboard layout placeholder exists.
- [ ] API health endpoint works.
- [ ] README documentation is complete.
- [ ] Production build succeeds.
- [ ] No major TypeScript or lint errors remain.

## 15. Strict Scope Restrictions

Do NOT implement:

- Registration.
- Login.
- Authentication.
- Password management.
- Player profiles.
- Profile image uploads.
- Match creation.
- Match scoring.
- ITTF rules engine.
- Player statistics.
- Rankings.
- Tournaments.
- Admin management.

These features will be developed in subsequent phases.

## 16. Final Instructions

Work only on Phase 1.

First inspect the repository, then implement the foundation.

Do not move to Phase 2 automatically.

When finished, provide a report containing:

1. What was created.
2. Project folder structure.
3. Dependencies installed.
4. Database configuration details.
5. Commands required to run the project.
6. Tests performed and their results.
7. Any remaining setup required from the developer.
8. Confirmation of whether all Phase 1 completion criteria passed.

Wait for further instructions before implementing Phase 2.
