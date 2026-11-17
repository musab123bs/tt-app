import { z } from "zod";

export const tournamentFormatSchema = z.enum(["SINGLE_ELIMINATION", "ROUND_ROBIN"]);
export const tournamentStatusSchema = z.enum(["DRAFT", "OPEN_REGISTRATION", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const tieBreakRuleSchema = z.enum(["MATCH_WIN_PERCENTAGE", "HEAD_TO_HEAD", "GAME_DIFFERENCE", "POINT_DIFFERENCE"]);

const editableFields = {
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000),
  bannerImage: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(2048)]),
  location: z.string().trim().max(200),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime(),
  registrationDeadline: z.iso.datetime(),
  format: tournamentFormatSchema,
  maxParticipants: z.number().int().min(2).max(256),
  minParticipants: z.number().int().min(2).max(256),
  bestOf: z.union([z.literal(3), z.literal(5), z.literal(7)]),
  registrationRequiresApproval: z.boolean(),
  rules: z.string().trim().max(5000),
  tieBreakOrder: z.array(tieBreakRuleSchema).min(1).max(4),
};

// Defaults belong only to creation: applying them to partial updates would
// silently overwrite existing tournament settings.
const tournamentFields = z.object({
  ...editableFields,
  description: editableFields.description.optional().default(""),
  bannerImage: editableFields.bannerImage.optional().default(""),
  location: editableFields.location.optional().default(""),
  minParticipants: editableFields.minParticipants.default(2),
  bestOf: editableFields.bestOf.default(5),
  registrationRequiresApproval: editableFields.registrationRequiresApproval.default(false),
  rules: editableFields.rules.optional().default(""),
  tieBreakOrder: editableFields.tieBreakOrder.optional(),
  status: z.enum(["DRAFT", "OPEN_REGISTRATION"]).default("DRAFT"),
});

export const tournamentCreateSchema = tournamentFields.refine((value) => value.minParticipants <= value.maxParticipants, {
  message: "Minimum participants cannot exceed the maximum.",
  path: ["minParticipants"],
}).refine((value) => new Date(value.endDate) > new Date(value.startDate), {
  message: "Tournament end must be after its start.",
  path: ["endDate"],
}).refine((value) => new Date(value.registrationDeadline) <= new Date(value.startDate), {
  message: "Registration deadline must be on or before the tournament start.",
  path: ["registrationDeadline"],
}).refine((value) => !value.tieBreakOrder || new Set(value.tieBreakOrder).size === value.tieBreakOrder.length, {
  message: "Tie-break rules cannot be repeated.",
  path: ["tieBreakOrder"],
});

export const tournamentUpdateSchema = z.object(editableFields)
  .partial()
  .extend({ status: z.enum(["DRAFT", "OPEN_REGISTRATION", "CANCELLED"]).optional() })
  .refine((value) => !value.tieBreakOrder || new Set(value.tieBreakOrder).size === value.tieBreakOrder.length, {
    message: "Tie-break rules cannot be repeated.",
    path: ["tieBreakOrder"],
  });

export const registrationReviewSchema = z.object({
  participantId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT", "REMOVE"]),
  reason: z.string().trim().max(500).optional().default(""),
  seed: z.number().int().min(1).max(256).nullable().optional(),
});

export const scheduleFixtureSchema = z.object({ scheduledAt: z.iso.datetime() });
