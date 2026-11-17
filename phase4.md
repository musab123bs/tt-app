
# PHASE 4: MATCH MANAGEMENT & LIVE SCORING SYSTEM

## Project Context

We are building a professional Table Tennis Player Records & Statistics Platform using Next.js.

Previous phases:
- Phase 1: Project Foundation & Database
- Phase 2: Player Authentication & Profiles
- Phase 3: Player Dashboard & Statistics

Phase 4 focuses on Match Management, Live Scoring, Match History and automatic match record generation.

IMPORTANT:
First inspect the existing codebase, database schema, authentication system and previous phase implementations.

Do not recreate existing functionality or introduce duplicate components.

---

## 1. Match Creation

Allow authenticated players to create a new match.

Match creation should include:

- Select opponent from registered players.
- Search players by name.
- Select match format.
- Select number of games (Best of 3, Best of 5, Best of 7).
- Select match type (Singles).
- Match date and time.
- Optional match location.
- Optional match notes.

The player creating the match should automatically become Player 1.

Both players must be registered users.

Prevent invalid match creation, including selecting oneself as opponent.

---

## 2. Live Match Scoring

Build an interactive live scoring interface.

Display:

- Player 1 name and profile image.
- Player 2 name and profile image.
- Current game score.
- Overall match score.
- Current server indicator.
- Game number.
- Match status.

Scoring controls:

- Player 1 +1 point.
- Player 2 +1 point.
- Undo last point.
- Confirm game completion.
- Finish match.

The scoreboard must update instantly when points are added.

Provide clear visual feedback for the leading player and current server.

---

## 3. Official Table Tennis Rules

Implement standard ITTF table tennis scoring rules.

### Points
- Each game is played to 11 points.
- A player must win by at least 2 points.
- At 10-10, play continues until a player leads by 2 points.

### Service Rules
- Service changes after every 2 points.
- At 10-10, service alternates after every point.
- Maintain correct service rotation throughout the game.

### Match Format
- Best of 3, Best of 5 and Best of 7.
- First player to win the required number of games wins the match.
- Track individual game scores.

### Change of Ends
- Players change ends after each game.
- In the deciding game, players change ends when one player reaches 5 points.

Ensure the scoring engine follows these rules consistently.

---

## 4. Match Controls & Validation

Implement:

- Undo previous scoring action.
- Prevent scoring after match completion.
- Prevent invalid game completion.
- Prevent duplicate match submission.
- Handle accidental page refresh.
- Preserve ongoing match state.
- Confirm before abandoning an active match.

Do not allow users to manipulate completed match results without proper authorization.

---

## 5. Match Completion & Results

When a match finishes:

Automatically calculate:

- Match winner.
- Match loser.
- Final game score.
- Individual game results.
- Total points scored by each player.
- Match duration (where reliable).
- Match completion date.

Save the completed match to the database.

Update both players' match history and statistics.

---

## 6. Match History

Create a Match History section.

Display:

- Opponent name and profile image.
- Match date.
- Match result (Won/Lost).
- Final score.
- Match format.
- Match status.

Include filters:

- All Matches.
- Won.
- Lost.
- In Progress.

Allow players to open a match and view its detailed scorecard.

Only show matches the authenticated player is authorized to access.

---

## 7. Database Integration

Inspect the existing database and Prisma schema before making changes.

Create or update the required models for:

- Match.
- Match Players.
- Game Scores.
- Point History.
- Match Results.

Requirements:

- Maintain proper database relationships.
- Store match and game scores accurately.
- Store point-by-point history.
- Ensure data consistency.
- Use database transactions for match completion.
- Avoid duplicate records.

Use migrations where necessary.

Do not delete existing data or unnecessarily restructure previous models.

---

## 8. UI/UX Requirements

Build a premium, modern and responsive scoring experience.

- Clean scoreboard design.
- Large, readable score numbers.
- Easy-to-use scoring buttons.
- Responsive mobile and desktop layouts.
- Loading and error states.
- Confirmation dialogs.
- Accessible buttons and labels.

Maintain the existing application's design system, typography and colors.

Do not redesign previously completed pages unnecessarily.

---

## 9. Testing Requirements

Test the following scenarios:

1. Normal game ending at 11 points.
2. Deuce situation at 10-10.
3. Extended game (12-10, 13-11, etc.).
4. Correct service rotation.
5. Best of 3 match.
6. Best of 5 match.
7. Best of 7 match.
8. Deciding game end changes.
9. Undo previous point.
10. Refresh during an active match.
11. Match completion and database saving.
12. Both players' match histories.
13. Unauthorized access to another player's records.

Verify scoring calculations against standard rules.

---

## 10. Final Requirements

- Use real database records.
- No dummy or hardcoded match data.
- No fake API responses.
- Maintain compatibility with Phases 1, 2 and 3.
- Do not break existing authentication or dashboard functionality.
- Follow existing project architecture.
- Fix any bugs introduced during this phase.

At completion, provide a report containing:

1. Features implemented.
2. Database changes.
3. API endpoints created or updated.
4. Components and files modified.
5. Testing results.
6. Remaining issues.

Do not start Phase 5 until Phase 4 is implemented and tested successfully.
