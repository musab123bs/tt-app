
# PHASE 7: SUPER ADMIN PANEL & PLATFORM MANAGEMENT

## Project Context

We are developing a Table Tennis Player Records & Statistics Platform.

Existing technology:
- Next.js
- TypeScript (if configured)
- Existing headless database
- Existing authentication system
- Existing player profiles
- Existing match management and live scoring
- Existing player statistics and analytics
- Existing tournament management

IMPORTANT:
First inspect the entire existing project architecture and implementations from Phases 1–6.

Reuse existing database models, APIs, services, components, and authentication.

Do not recreate existing features.
Do not break existing player, match, scoring, statistics, or tournament functionality.

---

## 1. Super Admin Authentication & Access Control

Implement a secure Super Admin role.

Requirements:

- Super Admin must have a separate role or permission level.
- Only authorized Super Admin accounts can access the admin panel.
- Protect all admin routes on the server.
- Protect all admin APIs independently.
- Do not rely on frontend-only role checks.
- Prevent regular players from accessing admin functionality.
- Redirect unauthorized users appropriately.
- Never allow users to assign themselves the Super Admin role.

Reuse the existing authentication and authorization architecture.

---

## 2. Admin Dashboard

Create a professional Super Admin dashboard.

Display platform-wide statistics:

### User Statistics
- Total registered users.
- Active users.
- Suspended users.
- Newly registered users.
- Players with completed profiles.

### Match Statistics
- Total matches.
- Completed matches.
- Ongoing matches.
- Cancelled matches.
- Matches played this week/month.

### Tournament Statistics
- Total tournaments.
- Upcoming tournaments.
- Ongoing tournaments.
- Completed tournaments.
- Cancelled tournaments.

### Platform Activity
- Recent registrations.
- Recent matches.
- Recent tournaments.
- Recent administrative actions.

All dashboard values must come from real database records.

Do not use hardcoded statistics.

---

## 3. User Management

Create a complete user management section.

Admin should be able to:

- View all registered users.
- Search users by name or email.
- Filter by role and account status.
- View user details.
- View registration date.
- View last activity if tracked.
- Change permitted user roles.
- Suspend accounts.
- Reactivate suspended accounts.
- Permanently delete accounts when permitted.

Before destructive operations:

- Show a confirmation dialog.
- Explain the consequences.
- Prevent accidental deletion of the currently logged-in Super Admin.
- Protect critical system accounts.

Use soft deletion where appropriate to preserve historical match and tournament records.

---

## 4. Player Management

Create a dedicated player management section.

Admin can:

- View all player profiles.
- Search players.
- Filter by player level.
- View player statistics.
- View match history.
- View tournament participation.
- View player profile images.
- Suspend or restrict player accounts when necessary.
- Correct inappropriate or invalid profile information.

Important:

Do not allow administrative edits to corrupt historical statistics.

Any manual correction to player data should be tracked.

---

## 5. Match Management & Moderation

Create an administrative match management module.

Admin can:

- View all matches.
- Search matches by player.
- Filter by match status.
- Filter by date.
- View match details and score history.
- Review disputed matches.
- Mark a match as under review.
- Cancel invalid matches.
- Correct match results when authorized.
- Add an administrative reason for corrections.

Important:

- Never silently overwrite match results.
- Preserve the original result.
- Record every administrative correction.
- Recalculate affected player statistics and tournament standings when a result changes.
- Prevent unauthorized score manipulation.

Reuse the existing scoring engine.

---

## 6. Tournament Management

Admin should have platform-wide tournament management access.

Features:

- View all tournaments.
- Search tournaments.
- Filter by status and format.
- View tournament organizers.
- View participants.
- View fixtures and results.
- Review reported tournaments.
- Cancel tournaments when necessary.
- Resolve tournament disputes.
- Correct tournament data with an audit record.

Any tournament result correction must update related standings and player statistics safely.

Do not bypass existing tournament progression rules.

---

## 7. Reports & Disputes

Implement a reporting and moderation workflow.

Allow players to report:

- Incorrect match results.
- Suspicious match activity.
- Inappropriate player profiles.
- Tournament disputes.
- Other platform-related issues.

### Report Management

Admin should be able to:

- View submitted reports.
- Open report details.
- Review associated players, matches, or tournaments.
- Assign a report status.
- Add internal notes.
- Resolve or reject reports.
- Record the resolution reason.

Report statuses:

- Pending
- Under Review
- Resolved
- Rejected

Keep a history of report status changes.

---

## 8. Account Suspension & Moderation

Implement account moderation.

Admin can:

- Temporarily suspend users.
- Permanently restrict accounts when authorized.
- Reactivate suspended accounts.
- Record suspension reasons.
- Set suspension start and end dates.
- View moderation history.

Suspended users must not be able to perform restricted activities.

Examples:

- Registering for tournaments.
- Creating matches.
- Updating restricted profile information.
- Performing other protected actions.

Ensure suspension checks are enforced server-side.

---

## 9. Platform Settings

Create a platform settings module.

Allow Super Admin to manage configurable settings such as:

### General Settings
- Platform name.
- Platform logo.
- Platform description.
- Support email.
- Default timezone.

### Player Settings
- Allowed profile fields.
- Player level options.
- Profile visibility defaults.

### Match Settings
- Default match format.
- Available best-of formats.
- Match-related platform configuration.

### Tournament Settings
- Available tournament formats.
- Default registration settings.
- Default participant limits.
- Default tournament match format.

### Ranking Settings
- Minimum completed matches for ranking eligibility.
- Ranking calculation configuration.
- Tie-break configuration.

Important:

Settings must be stored persistently in the database.

Validate all settings before saving.

Do not hardcode values that should be configurable.

Do not allow settings changes to invalidate existing match or tournament records.

---

## 10. Audit Logs & Administrative Activity

Create an audit logging system.

Track important administrative operations:

- User role changes.
- Account suspensions.
- Account reactivations.
- User deletions.
- Match result corrections.
- Tournament modifications.
- Report resolutions.
- Platform settings changes.

Each audit record should include:

- Admin ID.
- Action type.
- Target entity type.
- Target entity ID.
- Previous value where appropriate.
- New value where appropriate.
- Reason or description.
- Timestamp.

Audit logs must be protected from ordinary users.

Do not expose sensitive credentials, passwords, tokens, or private authentication data in logs.

Administrative audit records should not be editable through ordinary admin interfaces.

---

## 11. Admin Notifications

Provide notifications for important platform events:

- New user registration.
- New match dispute.
- New tournament report.
- Suspicious activity report.
- Account moderation events.
- Important system events.

Reuse the existing notification infrastructure.

Avoid creating duplicate notification systems.

---

## 12. Admin UI & Navigation

Create a dedicated admin layout.

Suggested navigation:

- Overview
- Users
- Players
- Matches
- Tournaments
- Reports & Disputes
- Moderation
- Rankings
- Platform Settings
- Audit Logs

UI requirements:

- Professional admin dashboard.
- Responsive sidebar.
- Mobile-friendly navigation.
- Search and filters.
- Pagination.
- Data tables.
- Status indicators.
- Loading states.
- Empty states.
- Error states.
- Confirmation dialogs.
- Consistent design with the existing application.

Do not redesign the public player interface unnecessarily.

---

## 13. Database & API Requirements

Inspect the existing database schema before implementing.

Add or update models only where necessary.

Possible entities:

- PlatformSettings
- AdminAuditLog
- UserReport
- ModerationAction

Reuse existing User, Player, Match, Tournament, and Notification models.

Requirements:

- Proper relationships.
- Appropriate indexes.
- Unique constraints where necessary.
- Database migrations.
- Server-side validation.
- Consistent API error responses.
- Pagination for large datasets.
- Efficient database queries.

Use transactions for operations that modify multiple related records.

Never expose sensitive user information through admin APIs unnecessarily.

---

## 14. Performance & Security

Implement:

- Server-side authorization.
- Input validation.
- Rate limiting for sensitive operations where infrastructure supports it.
- Protection against unauthorized role escalation.
- Safe deletion and data retention.
- Secure administrative APIs.
- Pagination and filtering.
- Efficient database queries.
- Error handling without exposing internal secrets.

Do not trust client-submitted admin IDs or role values.

Identify the authenticated administrator on the server.

---

## 15. Testing & Validation

Test these scenarios:

- Super Admin login.
- Regular player blocked from admin routes.
- Unauthorized API access blocked.
- User search and filtering.
- Account suspension and reactivation.
- Player management.
- Match moderation.
- Match result correction.
- Tournament management.
- Report submission and resolution.
- Platform settings persistence.
- Audit log creation.
- Admin notifications.
- Mobile admin navigation.

Also test:

- Admin cannot accidentally remove their own critical access.
- Historical records remain intact after user deletion.
- Match corrections update related statistics.
- Tournament corrections update standings.
- Suspended users cannot perform restricted actions.
- Regular players cannot modify admin settings.

---

## 16. Final Verification

After implementation:

1. Run database migrations.
2. Run TypeScript checks.
3. Run ESLint.
4. Run relevant automated tests.
5. Run the production build.
6. Fix all issues introduced by this phase.
7. Verify Phases 1–6 still work.
8. Verify admin authorization from both frontend and backend.

Do not use dummy data for real platform functionality.

Do not silently ignore errors.

---

## Expected Final Report

Provide:

1. Features implemented.
2. Admin pages and components created.
3. API routes created or modified.
4. Database models and migrations.
5. Authorization changes.
6. Tests performed and results.
7. Remaining bugs or limitations.
8. Manual setup instructions.

IMPORTANT:
Complete Phase 7 without breaking existing functionality from Phases 1–6.

Do not start Phase 8 until this phase is tested and stable.
