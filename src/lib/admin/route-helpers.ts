import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import { getAdminApiContext, type AdminContext } from "@/lib/admin/auth";
import { adminErrorResponse } from "@/lib/admin/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export async function withAdmin(handler: (admin: AdminContext) => Promise<Response>) {
  const context = await getAdminApiContext();
  if (context.response) return context.response;
  try {
    return await handler(context.admin);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function readAdminBody<T extends z.ZodType>(request: Request, schema: T, admin: AdminContext): Promise<{ data: z.infer<T>; response?: never } | { data?: never; response: Response }> {
  const limit = checkRateLimit(`admin-mutation:${admin.id}`, 30, 60_000);
  if (!limit.allowed) return { response: NextResponse.json({ error: "Too many administrative actions. Wait a moment and try again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }) };
  let body: unknown;
  try { body = await request.json(); } catch { return { response: NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }) }; }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the submitted values.", field: parsed.error.issues[0]?.path.join(".") }, { status: 400 }) };
  return { data: parsed.data };
}

export function searchParam(request: Request, key: string) {
  return new URL(request.url).searchParams.get(key)?.trim() || undefined;
}
