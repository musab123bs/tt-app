
# PHASE 02 — AUTHENTICATION & PLAYER PROFILES

## 1. Objective

Implement a complete individual player authentication and profile management system for the Table Tennis Analytics application.

Every player must have their own secure account and be able to manage their personal player profile.

This phase builds on the existing Phase 1 foundation.

IMPORTANT:
Before writing code, inspect the existing project, database schema, Prisma configuration, reusable components, and API architecture.

Do not recreate or overwrite anything that is already working.

---

## 2. Technology Stack

Continue using the existing project stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- Lucide React

For authentication, use Better Auth unless Phase 1 already established a different working authentication solution.

Use a compatible, stable version.

For profile image storage, use Cloudinary.

Do not store image binary data directly in PostgreSQL.

---

## 3. Authentication System

Implement individual player authentication.

### Registration

Create a registration page:

`/register`

Required fields:

- Full name
- Email address
- Password
- Confirm password

Requirements:

- Validate all fields.
- Validate email format.
- Enforce appropriate password strength.
- Check for existing email addresses.
- Hash passwords securely through the authentication provider.
- Display meaningful validation messages.
- Prevent duplicate account creation.
- Show loading and success states.

After successful registration:

- Create the user account.
- Create the corresponding player profile.
- Assign the PLAYER role.
- Redirect the user to profile setup or the dashboard.

### Login

Create:

`/login`

Fields:

- Email address
- Password

Requirements:

- Secure authentication.
- Invalid credential handling.
- Loading state.
- Form validation.
- Session creation.
- Redirect authenticated users appropriately.

### Logout

Implement secure logout.

After logout, invalidate the session and redirect to the login page.

### Forgot Password

Create:

`/forgot-password`

Allow players to request a password reset.

Implement secure reset tokens and expiration through the authentication provider.

Configure email delivery through environment variables if required.

Do not pretend that emails are sent if the email provider is not configured.

---

## 4. User Roles & Permissions

Establish role-based access control.

Initial roles:

- PLAYER
- ADMIN
- COACH
- SCORER

For this phase, only PLAYER registration should be publicly available.

Never allow users to assign themselves ADMIN, COACH, or SCORER roles.

Role assignment must be controlled server-side.

---

## 5. Player Profile System

Create a dedicated player profile.

Every authenticated player must have one profile linked to their user account.

### Profile Information

Required:

- Full name
- Profile image
- Player level

Optional:

- Bio
- Country
- City
- Club name
- Playing hand
- Playing style
- Date of birth

### Playing Hand

Options:

- Right-handed
- Left-handed

### Playing Style

Options:

- Offensive
- Defensive
- All-round

### Player Level

Provide four levels:

1. Beginner
2. Intermediate
3. Advanced
4. Professional

Store these as proper enum values in PostgreSQL.

Important:

Player level is a skill classification, not an official competitive ranking.

Do not confuse skill level with future leaderboard rankings.

Players can select their initial level and update it later.

Keep the data model flexible enough to support future coach/admin verification.

---

## 6. Profile Image Upload

Use Cloudinary for profile image storage.

Requirements:

- Upload profile images.
- Display image preview.
- Allow image replacement.
- Validate image file types.
- Enforce an appropriate file size limit.
- Store the Cloudinary URL and public ID in the database.
- Allow users to remove their profile image.
- Provide a default avatar when no image exists.

Security:

- Use signed uploads or a secure server-side upload flow.
- Never expose Cloudinary API secrets to the browser.
- Validate uploads on the server.
- Do not accept arbitrary external image URLs as trusted uploads.

Environment variables:

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

---

## 7. Profile Pages

Create the following routes:

### `/profile`

Display the authenticated player's profile.

Include:

- Profile image
- Full name
- Email address
- Player level
- Country and city
- Club
- Playing hand
- Playing style
- Bio
- Edit profile action

### `/profile/edit`

Allow the player to update their information.

Requirements:

- Prepopulate existing values.
- Validate changes.
- Save changes to PostgreSQL.
- Display success and error feedback.
- Prevent editing another player's profile.

### `/players/[id]`

Create a public player profile page.

Display only public profile information:

- Profile image
- Player name
- Player level
- Club
- Country
- Playing hand
- Playing style
- Bio

Never expose:

- Passwords
- Authentication tokens
- Private email addresses
- Internal account data

The public profile should be accessible without authentication if the player has chosen to make it public.

Add an `isPublic` field to the player profile, defaulting to true.

---

## 8. Database Architecture

Extend the existing Prisma schema without destroying existing models.

Implement or update the following conceptual models.

### User

Fields:

- id
- name
- email
- emailVerified
- role
- createdAt
- updatedAt

The exact authentication-related fields and models must follow the chosen Better Auth adapter requirements.

Do not duplicate authentication tables unnecessarily.

### PlayerProfile

Fields:

- id
- userId
- profileImageUrl
- profileImagePublicId
- bio
- country
- city
- clubName
- playingHand
- playingStyle
- playerLevel
- isPublic
- createdAt
- updatedAt

Relationship:

- One User has one PlayerProfile.
- One PlayerProfile belongs to one User.

Use suitable enum types.

Add appropriate unique constraints and indexes.

Use cascading behavior carefully and document deletion implications.

Do not create PlayerProfile records without a valid User.

---

## 9. API Architecture

Use Next.js Route Handlers or the existing API conventions.

Implement secure endpoints for:

### Authentication

Use the authentication provider's recommended endpoints and client methods.

### Player Profile

GET `/api/profile`

Return the authenticated player's profile.

PATCH `/api/profile`

Update the authenticated player's profile.

### Profile Image

POST `/api/profile/avatar`

Upload a profile image securely.

DELETE `/api/profile/avatar`

Remove the current player's profile image.

### Public Player Profile

GET `/api/players/[id]`

Return public profile information only.

Important:

- Authenticate protected requests.
- Authorize all profile updates server-side.
- Validate input using Zod.
- Never trust a user ID supplied by the browser for ownership.
- Derive the current user from the authenticated session.
- Return appropriate HTTP status codes.
- Never expose sensitive information.

---

## 10. UI/UX Requirements

Maintain the existing Phase 1 design system.

Visual direction:

- Premium sports dashboard.
- Clean light theme.
- Primary blue: #0B82FF.
- White cards.
- Neutral backgrounds.
- Consistent spacing.
- Professional typography.
- Subtle borders.
- Responsive layouts.
- Minimal shadows.

### Registration Page

Create a modern registration interface.

Include:

- Application branding.
- Registration form.
- Password visibility toggle.
- Password validation feedback.
- Login link.
- Responsive layout.

### Login Page

Include:

- Email input.
- Password input.
- Show/hide password.
- Remember-me option only if supported by the authentication implementation.
- Forgot password link.
- Registration link.

### Profile Page

Create a premium player profile layout.

Include:

- Large profile avatar.
- Player information.
- Skill level badge.
- Playing style.
- Profile details.
- Edit profile button.

### Edit Profile Page

Use a well-organized form.

Group fields into:

1. Personal information.
2. Player information.
3. Profile image.
4. Privacy settings.

Provide clear validation and save feedback.

---

## 11. Security Requirements

This phase must follow secure development practices.

- Hash passwords through the authentication provider.
- Use secure session handling.
- Protect private routes.
- Validate user input on the server.
- Enforce role-based authorization.
- Prevent IDOR vulnerabilities.
- Protect profile ownership.
- Validate image uploads.
- Never expose secret environment variables.
- Do not store passwords in PlayerProfile.
- Do not return private account information in public APIs.

---

## 12. Environment Variables

Update `.env.example` without deleting existing variables.

Include the required configuration for:

- DATABASE_URL
- Better Auth secret and base URL
- Cloudinary credentials
- Email provider credentials if required

Use the exact variable names expected by the installed libraries.

Never add actual credentials to source control.

Document every variable in README.md.

---

## 13. Testing Requirements

Test the following scenarios:

### Registration

- Valid registration.
- Invalid email.
- Weak password.
- Duplicate email.
- Password mismatch.
- Successful player profile creation.

### Login

- Correct credentials.
- Incorrect credentials.
- Unauthenticated access to protected routes.
- Session persistence.
- Logout.

### Profile

- View own profile.
- Edit own profile.
- Change player level.
- Upload image.
- Replace image.
- Remove image.
- Attempt to edit another player's profile.

### Public Profile

- Public profile visibility.
- Private profile visibility restrictions.
- Verify private email is never exposed.

### Build

- TypeScript checks.
- ESLint.
- Prisma validation.
- Database migration.
- Production build.

Do not claim tests passed unless they were actually executed.

---

## 14. Phase Completion Criteria

Phase 2 is complete when:

- [ ] Registration works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Password reset workflow is implemented.
- [ ] Secure sessions work.
- [ ] Player role is assigned securely.
- [ ] Player profile is created automatically.
- [ ] Profile editing works.
- [ ] Profile image upload works.
- [ ] Player levels work.
- [ ] Playing hand and style work.
- [ ] Public player profile works.
- [ ] Private information is protected.
- [ ] Database migrations succeed.
- [ ] TypeScript and ESLint checks pass.
- [ ] Production build succeeds.

---

## 15. Strict Scope Restrictions

Do NOT implement:

- Match creation.
- Match scoring.
- ITTF scoring engine.
- Game records.
- Point records.
- Player statistics.
- Leaderboards.
- Tournaments.
- Live match updates.

These belong to later phases.

Do not automatically proceed to Phase 3.

---

## 16. Final Developer Report

After implementation, provide:

1. Files created.
2. Files modified.
3. Dependencies installed.
4. Database schema changes.
5. Migration details.
6. Authentication implementation details.
7. Cloudinary setup instructions.
8. Environment variables required.
9. Commands to run the project.
10. Tests performed and results.
11. Any external configuration still required.
12. Phase completion checklist.

Wait for approval before starting Phase 3.
