
# PHASE 03 — PLAYER DASHBOARD & STATISTICS FOUNDATION

## 1. Objective

Build a premium, responsive Player Dashboard for the Table Tennis Analytics application.

The dashboard must provide each authenticated player with an overview of their table tennis activity and performance.

It should display:

- Player information.
- Match statistics.
- Wins and losses.
- Win percentage.
- Games won and lost.
- Recent activity.
- Performance visualizations.
- Player profile completion.

This phase must extend the existing Phase 1 and Phase 2 implementation.

IMPORTANT:
Inspect the existing project before making changes.

Reuse the existing authentication system, Prisma models, UI components, database configuration, and design system.

Do not rebuild existing functionality.

---

## 2. Technology Stack

Continue using:

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- Lucide React

For charts, use Recharts.

Use Server Components for data fetching wherever practical.

Use Client Components only for interactive visualizations and UI interactions.

Do not introduce unnecessary dependencies.

---

## 3. Dashboard Route

Create or improve:

`/dashboard`

Requirements:

- Only authenticated users can access the dashboard.
- Redirect unauthenticated users to login.
- Display the currently authenticated player's information.
- Fetch dashboard data from PostgreSQL.
- Never use hardcoded statistics.
- Never display fabricated match records.
- Ensure each player sees only their own private dashboard data.

---

## 4. Dashboard Layout

Create a professional sports analytics dashboard.

### Sidebar Navigation

Include:

- Dashboard
- My Profile
- My Matches
- Statistics
- Rankings
- Settings
- Logout

Important:

Some of these features will be implemented in later phases.

For routes that are not implemented yet, use a clear disabled or coming-soon state rather than creating fake functionality.

### Top Navigation

Include:

- Application logo/name.
- Page title or breadcrumb.
- Player avatar.
- Player name.
- Profile dropdown.
- Logout option.

### Mobile Navigation

- Responsive sidebar.
- Mobile menu toggle.
- Overlay navigation.
- Accessible keyboard interactions.
- Appropriate focus management.

---

## 5. Dashboard Welcome Section

At the top of the dashboard display:

- Greeting using the player's name.
- Short welcome message.
- Player profile image.
- Current player level.
- View profile action.

Example:

"Welcome back, Alex!"

"Here's an overview of your table tennis performance."

Do not hardcode example player names.

Use the authenticated user's actual information.

---

## 6. Main Statistics Cards

Create four primary statistics cards.

### Card 1 — Total Matches

Display:

- Total matches played.
- Optional comparison with the previous period when sufficient historical data exists.

### Card 2 — Matches Won

Display:

- Total wins.
- Win indicator.

### Card 3 — Matches Lost

Display:

- Total losses.
- Loss indicator.

### Card 4 — Win Rate

Calculate:

Win Rate = (Matches Won / Total Completed Matches) × 100

If the player has not completed any matches:

Display `0%` or an appropriate empty state.

Do not divide by zero.

IMPORTANT:

Only completed matches with valid final results should contribute to win/loss statistics.

Scheduled, abandoned, suspended, and unfinished matches must not be counted as completed wins or losses.

Retirements, walkovers, and defaults must follow the final result recorded by the match system in future phases.

Do not invent match outcomes.

---

## 7. Additional Performance Statistics

Create a secondary statistics section.

Include:

### Games Won

Total games won across completed matches.

### Games Lost

Total games lost across completed matches.

### Points Won

Total points scored across completed matches.

### Points Lost

Total points conceded across completed matches.

### Longest Winning Streak

Calculate the longest consecutive sequence of completed match victories.

### Best Performance

Display an appropriate performance indicator only when sufficient match data exists.

Do not calculate unsupported metrics.

If the relevant match or point records do not exist yet, display an informative empty state.

---

## 8. Performance Charts

Use Recharts to build responsive visualizations.

### Chart 1 — Match Performance

Display wins and losses over time.

Recommended format:

- Line chart or bar chart.
- Date-based X-axis.
- Wins and losses as separate series.
- Tooltips.
- Responsive dimensions.

### Chart 2 — Win/Loss Distribution

Use a donut chart to display:

- Wins.
- Losses.

Show percentages and totals.

If there are no completed matches, display an empty chart state.

### Chart 3 — Games Performance

Display games won versus games lost.

Use a bar chart.

### Chart 4 — Recent Performance Trend

Display the player's performance over a selected period.

Possible filters:

- Last 7 days.
- Last 30 days.
- Last 90 days.
- All time.

Only show filters that can be supported by actual data.

All charts must be generated from database records.

Never generate random chart data or use static demo arrays in production.

---

## 9. Recent Match Activity

Create a Recent Matches section.

Display:

- Opponent name.
- Opponent profile image.
- Match date.
- Match format.
- Final score.
- Match result.
- Match status.

Include a View All action.

Since match management is a later phase:

- Build the UI only if compatible match models already exist.
- Otherwise show a clean empty state.
- Do not create fake matches.
- Do not introduce a temporary or duplicate match database model.

Example empty state:

"No matches recorded yet."

"Your match history and performance statistics will appear here once you start playing."

---

## 10. Player Profile Completion

Create a profile completion indicator.

Check whether the player has provided:

- Full name.
- Profile image.
- Bio.
- Country.
- City.
- Club.
- Playing hand.
- Playing style.
- Player level.

Calculate completion percentage based on valid populated fields.

Requirements:

- Display progress percentage.
- Show missing profile fields.
- Provide an Edit Profile link.
- Update automatically when profile information changes.

Do not count fields that are optional but not configured as required unless clearly documented.

---

## 11. Database & Statistics Architecture

Inspect the existing Prisma schema before making any changes.

Use existing User and PlayerProfile relationships.

If Match, MatchParticipant, Game, or Point models already exist, reuse them.

Do not duplicate these models.

If match models do not exist yet:

- Do not create an incomplete match system.
- Create a clean statistics service abstraction.
- Return zero values and appropriate empty states.
- Make the service ready to integrate with Phase 4, Phase 5, and Phase 6.

Create a dedicated statistics service:

`src/lib/services/player-statistics.ts`

Suggested functions:

- getPlayerDashboardStats()
- getPlayerMatchSummary()
- getPlayerGameStats()
- getPlayerPointStats()
- getPlayerWinRate()
- getPlayerWinningStreak()
- getPlayerPerformanceTrend()
- getPlayerRecentMatches()
- getPlayerProfileCompletion()

Keep the statistics calculation logic separate from React components.

Use proper TypeScript interfaces for returned data.

Do not place database queries directly inside dashboard UI components.

---

## 12. API Architecture

Follow the existing API conventions.

If dashboard APIs are needed, create:

### GET /api/dashboard/overview

Returns:

- Player information.
- Total matches.
- Wins.
- Losses.
- Win rate.
- Games won.
- Games lost.
- Points won.
- Points lost.
- Winning streak.
- Profile completion.

### GET /api/dashboard/performance

Returns:

- Match performance over time.
- Win/loss distribution.
- Game performance.
- Selected date range.

### GET /api/dashboard/recent-matches

Returns the latest completed or relevant matches.

Requirements:

- Authenticate all private endpoints.
- Derive the player ID from the authenticated session.
- Never trust a player ID supplied by the client for private queries.
- Validate query parameters.
- Use pagination where appropriate.
- Return consistent API response structures.
- Handle empty datasets properly.
- Avoid exposing sensitive user information.

If Server Components can retrieve the same data securely without an additional HTTP request, prefer direct server-side service calls.

Avoid unnecessary internal API-to-API requests.

---

## 13. Performance & Database Optimization

Implement efficient database queries.

Requirements:

- Use Prisma select/include carefully.
- Avoid fetching unnecessary records.
- Avoid N+1 queries.
- Use database aggregation where appropriate.
- Add indexes only when justified by query patterns.
- Avoid calculating the same statistics repeatedly.
- Consider caching only after correctness is established.

Statistics must remain consistent with completed match records.

Do not introduce premature caching that causes stale results.

---

## 14. UI/UX Design Requirements

Maintain the existing application design system.

Design direction:

- Premium sports analytics dashboard.
- Clean light theme.
- Primary blue: #0B82FF.
- White cards.
- Neutral gray background.
- Professional typography.
- Subtle borders.
- Consistent spacing.
- Minimal shadows.
- No unnecessary gradients.
- No excessive animations.

### Statistics Cards

Each card should include:

- Clear label.
- Main numeric value.
- Relevant icon.
- Supporting description.
- Appropriate visual hierarchy.

### Charts

- Responsive.
- Readable labels.
- Useful tooltips.
- Consistent typography.
- Accessible color contrast.

### Loading States

Implement:

- Dashboard skeleton.
- Statistics card skeleton.
- Chart skeleton.
- Recent match skeleton.

### Error States

Display meaningful error messages and retry actions where appropriate.

### Empty States

Provide clear messaging when players have no match history or performance records.

---

## 15. Data Accuracy Rules

These rules are mandatory.

1. Never use dummy statistics.
2. Never generate random match data.
3. Never count unfinished matches as completed.
4. Never count abandoned matches as wins or losses without an officially recorded result.
5. Calculate win rate from valid completed match outcomes.
6. Calculate game statistics from actual game records.
7. Calculate point statistics from actual point records.
8. Keep calculations independent of presentation components.
9. Ensure player-specific data isolation.
10. Handle missing data and division by zero safely.

---

## 16. Testing Requirements

Test the following:

### Authentication

- Unauthenticated users cannot access dashboard.
- Authenticated users can access their dashboard.
- Logout works correctly.

### Statistics

- Zero matches.
- One completed win.
- One completed loss.
- Multiple completed matches.
- Unfinished match exclusion.
- Abandoned match exclusion.
- Win percentage calculation.
- Winning streak calculation.
- Games won/lost calculation.
- Points won/lost calculation.

### Player Isolation

- Player A cannot see Player B's private dashboard information.
- Player A cannot access Player B's private statistics through API parameters.

### UI

- Desktop layout.
- Tablet layout.
- Mobile layout.
- Chart responsiveness.
- Loading states.
- Empty states.
- Error states.

### Build

- TypeScript validation.
- ESLint.
- Prisma validation.
- Production build.

Do not claim tests passed unless they were actually executed.

---

## 17. Phase Completion Criteria

Phase 3 is complete when:

- [ ] Dashboard route works.
- [ ] Authentication protection works.
- [ ] Player information loads correctly.
- [ ] Statistics cards are implemented.
- [ ] Win rate calculation is correct.
- [ ] Game and point statistics are supported.
- [ ] Performance charts work with real data.
- [ ] Recent matches section is implemented.
- [ ] Profile completion indicator works.
- [ ] Empty states are implemented.
- [ ] Loading states are implemented.
- [ ] Error states are implemented.
- [ ] Player data isolation is verified.
- [ ] Responsive design works.
- [ ] TypeScript and ESLint checks pass.
- [ ] Production build succeeds.

---

## 18. Strict Scope Restrictions

Do NOT implement:

- Match creation.
- Opponent selection workflows.
- Match scheduling.
- Match scoring.
- ITTF scoring engine.
- Live scoring.
- Point-by-point recording.
- Tournament management.
- Competitive ranking calculations.

These belong to subsequent phases.

Do not create fake matches to populate the dashboard.

Do not automatically proceed to Phase 4.

---

## 19. Final Developer Report

After implementation, provide:

1. Files created.
2. Files modified.
3. Dashboard features implemented.
4. Statistics calculation logic.
5. Database queries introduced.
6. API endpoints created.
7. Charts implemented.
8. Empty states and loading states.
9. Tests performed and results.
10. Any remaining limitations.
11. Confirmation of Phase 3 completion criteria.

Wait for approval before starting Phase 4.
