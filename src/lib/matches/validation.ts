import { z } from "zod";

export const matchCreationSchema = z.object({
  requestId: z.uuid(),
  opponentId: z.string().min(1),
  matchType: z.literal("SINGLES").default("SINGLES"),
  bestOf: z.union([z.literal(3), z.literal(5), z.literal(7)]),
  scheduledAt: z.iso.datetime(),
  location: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const matchFilterSchema = z.enum(["all", "won", "lost", "in_progress"]);

export const matchCommandSchema = z.object({
  requestId: z.uuid(),
  action: z.enum(["point", "undo", "confirm_game", "finish"]),
  playerId: z.string().min(1).optional(),
});

export const requestIdSchema = z.object({ requestId: z.uuid() });
