
# PHASE 6: TOURNAMENT MANAGEMENT & COMPETITION SYSTEM

## Project Context

We are building a Table Tennis Player Records & Statistics Platform using:

- Next.js
- TypeScript (if already configured)
- Existing headless database
- Existing authentication system
- Existing Player Profile system
- Existing Match Management & Live Scoring system
- Existing Player Statistics & Analytics system

IMPORTANT:
Before implementing anything, inspect the existing project architecture, database schema, authentication, match models, scoring logic, and previous phases.

Do not recreate existing functionality.
Do not break or replace existing features.
Reuse existing components, APIs, database models, and services wherever possible.

---

## 1. Tournament Management

Create a complete Tournament Management module.

Users should be able to:

- Create a tournament.
- View available tournaments.
- View tournament details.
- Edit tournaments they own, subject to permissions.
- Cancel or delete tournaments according to their status and permissions.
- View completed tournaments and their winners.

### Tournament Creation Fields

- Tournament Name
- Tournament Description
- Tournament Image / Banner
- Tournament Location
- Start Date
- End Date
- Registration Deadline
- Tournament Format
- Maximum Participants
- Minimum Participants
- Match Format (Best of 3, 5, or 7)
- Tournament Status

### Tournament Status

- Draft
- Open for Registration
- Registration Closed
- In Progress
- Completed
- Cancelled

Validate all dates and tournament settings.

---

## 2. Tournament Formats

Support these tournament formats:

### A. Single Elimination

- A player is eliminated after losing one match.
- Winners advance to the next round.
- Continue until the final match.
- Automatically determine the champion and runner-up.
- Support byes when participant count is not a power of two.

### B. Round Robin

- Every participant plays against every other participant.
- Generate fixtures automatically.
- Calculate standings based on match results.
- Display wins, losses, matches played, and points.
- Determine tournament winner using configurable tie-break rules.

### C. Double Elimination (Optional / If Feasible)

- Players move into a losers bracket after their first loss.
- A second loss eliminates them.
- Support the grand final and reset final when required.

Keep tournament format logic modular so more formats can be added later.

---

## 3. Player Registration

Allow authenticated players to:

- Browse open tournaments.
- View tournament details and rules.
- Register for a tournament.
- Cancel registration before the deadline.
- View their registration status.
- View registered participants.

Registration validation:

- Prevent duplicate registration.
- Prevent registration after the deadline.
- Enforce maximum participant limits.
- Prevent registration in cancelled or completed tournaments.
- Do not allow the tournament creator to bypass registration rules without authorization.

Tournament organizers should be able to:

- View registration requests.
- Approve or reject registrations if approval is enabled.
- Remove participants with a recorded reason.
- Close registration manually.

---

## 4. Tournament Draw & Fixture Generation

After registration closes, organizers should be able to generate tournament fixtures.

### Single Elimination

- Randomize participants by default.
- Allow organizers to manually seed players.
- Generate rounds and matches.
- Handle byes correctly.
- Avoid generating duplicate fixtures.
- Preserve the draw once matches have started.

### Round Robin

- Generate fixtures so every participant plays every other participant exactly once.
- Avoid duplicate matchups.
- Support odd participant counts using bye rounds.
- Generate a clear schedule.

Important:
Fixture generation must be deterministic after the draw is finalized. Do not regenerate or overwrite existing fixtures accidentally.

---

## 5. Tournament Match Integration

Integrate tournaments with the existing Match Management & Live Scoring system.

IMPORTANT:

Do not create a separate scoring engine.

Reuse the existing match scoring functionality and ITTF scoring rules.

Every tournament match should be linked to:

- Tournament
- Tournament Round
- Player 1
- Player 2
- Existing Match Record
- Match Status
- Winner
- Scheduled Date/Time

When a tournament match is completed:

1. Save the match result.
2. Update the tournament bracket or standings.
3. Advance the winner to the next round for elimination tournaments.
4. Update player standings for round-robin tournaments.
5. Refresh tournament statistics.
6. Prevent duplicate result processing.

Use database transactions where multiple records must be updated together.

---

## 6. Tournament Standings & Leaderboard

For Round Robin tournaments, display:

- Position
- Player Name
- Player Image
- Matches Played
- Matches Won
- Matches Lost
- Games Won
- Games Lost
- Points Scored
- Points Conceded
- Points Difference

Use configurable tie-break rules.

Suggested default order:

1. Match win percentage.
2. Head-to-head result.
3. Game difference.
4. Points difference.

Clearly document the tie-break rules and apply them consistently.

For elimination tournaments, display the current bracket and player progression.

---

## 7. Tournament Details Page

Create a professional tournament details page.

Include:

- Tournament banner and name.
- Tournament status.
- Location and dates.
- Registration deadline.
- Tournament format.
- Maximum participants.
- Registered players.
- Tournament rules.
- Fixture schedule.
- Live match status.
- Results.
- Final standings.
- Champion and runner-up.

Use responsive layouts for desktop, tablet, and mobile.

---

## 8. Tournament Dashboard

Create a tournament dashboard for authenticated users.

Display:

- My Registered Tournaments.
- Tournaments I Created.
- Upcoming Tournaments.
- Ongoing Tournaments.
- Completed Tournaments.
- My Tournament Results.

Add appropriate empty states when no tournaments exist.

---

## 9. Tournament History & Player Profiles

Integrate tournament records into existing player profiles.

Display:

- Tournaments participated in.
- Tournament wins.
- Runner-up finishes.
- Tournament match history.
- Tournament win/loss record.
- Tournament performance statistics.

Update existing player statistics without duplicating match records.

Tournament matches should count toward overall player statistics only once.

---

## 10. Database Design

Inspect the current Prisma/database schema before making changes.

Create or update models as required.

Suggested entities:

- Tournament
- TournamentParticipant
- TournamentRound
- TournamentFixture
- TournamentResult
- TournamentSettings

Use proper relationships with existing:

- User
- Player
- Match

Requirements:

- Add appropriate foreign keys.
- Add unique constraints.
- Add indexes for frequently queried fields.
- Handle deleted or withdrawn participants safely.
- Store tournament format and status using appropriate enums.
- Maintain referential integrity.
- Create database migrations.

Do not create duplicate Player or Match models.

Adapt these suggested entities to the existing database architecture.

---

## 11. Authorization & Security

Implement proper permission checks.

### Tournament Organizer

Can:
- Create tournaments.
- Edit their own tournaments.
- Manage registrations.
- Generate fixtures.
- Schedule matches.
- Manage tournament progression.

### Registered Player

Can:
- Register for tournaments.
- View tournament details.
- View fixtures and results.
- View their own tournament history.

### Super Admin

Can:
- View all tournaments.
- Manage any tournament.
- Cancel tournaments.
- Resolve administrative issues.

Never rely only on frontend permission checks.

Validate authorization on the server/API layer.

---

## 12. Notifications

Add notifications for important tournament events:

- Successful registration.
- Registration approval/rejection.
- Registration closing.
- Fixture generation.
- Match scheduling.
- Upcoming match reminders, if notification infrastructure exists.
- Tournament completion.
- Tournament winner announcement.

Reuse the existing notification system if available.

Do not introduce a separate notification system unnecessarily.

---

## 13. UI/UX Requirements

Follow the existing application's design system.

Create:

- Tournament listing page.
- Tournament creation form.
- Tournament details page.
- Registration management page.
- Tournament bracket view.
- Round-robin fixtures view.
- Standings table.
- Tournament dashboard.
- Player tournament history section.

Requirements:

- Clean, modern interface.
- Responsive design.
- Consistent typography and spacing.
- Proper loading states.
- Error states.
- Empty states.
- Confirmation dialogs for destructive actions.
- Clear tournament status indicators.

Do not introduce unnecessary gradients or redesign unrelated pages.

---

## 14. Testing & Validation

Test the following scenarios:

- Create a tournament.
- Edit a tournament.
- Register a player.
- Prevent duplicate registration.
- Reject late registration.
- Enforce participant limits.
- Generate single-elimination brackets.
- Generate round-robin fixtures.
- Handle odd participant counts.
- Handle byes correctly.
- Complete a tournament match.
- Advance winners correctly.
- Update standings correctly.
- Prevent duplicate result processing.
- Calculate tournament winner correctly.
- Handle participant withdrawal.
- Prevent unauthorized operations.
- Verify tournament statistics on player profiles.

Also test edge cases:

- Only two participants.
- Odd number of participants.
- Maximum participant capacity.
- Player withdraws before the tournament starts.
- Player withdraws after fixtures are generated.
- Match is abandoned.
- Match is cancelled.
- Tournament is cancelled during an ongoing competition.

---

## 15. Final Verification

After implementation:

1. Run database migrations.
2. Run TypeScript checks.
3. Run ESLint.
4. Run all relevant tests.
5. Run the production build.
6. Fix all errors introduced by this phase.
7. Verify that previous phases still work.

Do not use fake or hardcoded data in production functionality.

Do not silently ignore errors.

Do not mark a tournament completed until its required matches and results are finalized.

---

## Expected Final Report

At the end, provide:

1. Features implemented.
2. Database models created or updated.
3. API routes created or modified.
4. Pages and components created.
5. Existing files modified.
6. Tests performed and their results.
7. Remaining issues, if any.
8. Any manual setup required.

IMPORTANT:
Complete Phase 6 without breaking Phases 1–5.

Do not start Phase 7 until Phase 6 is implemented, tested, and stable.
