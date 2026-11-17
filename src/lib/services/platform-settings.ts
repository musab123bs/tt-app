import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/prisma";

export const PROFILE_FIELDS = ["bio", "country", "city", "clubName", "playingHand", "playingStyle", "dateOfBirth"] as const;
export const PLAYER_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"] as const;
export const TIE_BREAK_RULES = ["MATCH_WIN_PERCENTAGE", "HEAD_TO_HEAD", "GAME_DIFFERENCE", "POINT_DIFFERENCE"] as const;
const bestOf = z.union([z.literal(3), z.literal(5), z.literal(7)]);
const unique = <T,>(values: T[]) => new Set(values).size === values.length;

const isTimeZone = (value: string) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
};

export const platformSettingsSchema = z.object({
  general: z.object({
    platformName: z.string().trim().min(2).max(80),
    logoUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(2048)]),
    description: z.string().trim().max(500),
    supportEmail: z.union([z.literal(""), z.email()]),
    timezone: z.string().refine(isTimeZone, "Choose a valid IANA timezone, e.g. Asia/Karachi."),
  }),
  player: z.object({
    allowedProfileFields: z.array(z.enum(PROFILE_FIELDS)).refine(unique, "Profile fields cannot repeat."),
    levelOptions: z.array(z.enum(PLAYER_LEVELS)).min(1, "Keep at least one player level.").refine(unique, "Levels cannot repeat."),
    profilesPublicByDefault: z.boolean(),
  }),
  match: z.object({
    defaultBestOf: bestOf,
    availableBestOf: z.array(bestOf).min(1).refine(unique, "Formats cannot repeat."),
  }).refine((value) => value.availableBestOf.includes(value.defaultBestOf), { message: "The default match format must be one of the available formats.", path: ["defaultBestOf"] }),
  tournament: z.object({
    availableFormats: z.array(z.enum(["SINGLE_ELIMINATION", "ROUND_ROBIN"])).min(1).refine(unique, "Formats cannot repeat."),
    defaultRequiresApproval: z.boolean(),
    defaultMinParticipants: z.number().int().min(2).max(256),
    defaultMaxParticipants: z.number().int().min(2).max(256),
    defaultBestOf: bestOf,
  }).refine((value) => value.defaultMinParticipants <= value.defaultMaxParticipants, { message: "Default minimum participants cannot exceed the maximum.", path: ["defaultMinParticipants"] }),
  ranking: z.object({
    minCompletedMatches: z.number().int().min(1).max(100),
    tieBreakOrder: z.array(z.enum(TIE_BREAK_RULES)).min(1).max(4).refine(unique, "Tie-break rules cannot repeat."),
  }),
});

export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

const SETTINGS_KEY = "platform.settings";

function envMinimumMatches() {
  const value = Number(process.env.LEADERBOARD_MIN_MATCHES ?? 5);
  return Number.isInteger(value) && value >= 1 ? value : 5;
}

export function getDefaultPlatformSettings(): PlatformSettings {
  return {
    general: { platformName: "Table Tennis Analytics", logoUrl: "", description: "", supportEmail: "", timezone: "UTC" },
    player: { allowedProfileFields: [...PROFILE_FIELDS], levelOptions: [...PLAYER_LEVELS], profilesPublicByDefault: true },
    match: { defaultBestOf: 5, availableBestOf: [3, 5, 7] },
    tournament: { availableFormats: ["SINGLE_ELIMINATION", "ROUND_ROBIN"], defaultRequiresApproval: false, defaultMinParticipants: 2, defaultMaxParticipants: 16, defaultBestOf: 5 },
    ranking: { minCompletedMatches: envMinimumMatches(), tieBreakOrder: [...TIE_BREAK_RULES] },
  };
}

export async function getPlatformSettings(db?: Prisma.TransactionClient): Promise<PlatformSettings> {
  const defaults = getDefaultPlatformSettings();
  const client = db ?? getPrismaClient();
  if (!client) return defaults;
  const row = await client.systemSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row?.value) return defaults;
  try {
    const stored = JSON.parse(row.value) as Partial<PlatformSettings>;
    const merged = {
      general: { ...defaults.general, ...stored.general },
      player: { ...defaults.player, ...stored.player },
      match: { ...defaults.match, ...stored.match },
      tournament: { ...defaults.tournament, ...stored.tournament },
      ranking: { ...defaults.ranking, ...stored.ranking },
    };
    const parsed = platformSettingsSchema.safeParse(merged);
    return parsed.success ? parsed.data : defaults;
  } catch {
    return defaults;
  }
}

export async function savePlatformSettings(tx: Prisma.TransactionClient, settings: PlatformSettings) {
  await tx.systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });
}
