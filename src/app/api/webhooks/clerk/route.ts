import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/webhooks/clerk
 * Handles Clerk user lifecycle events to keep the local User table in sync.
 * Verified via svix signature. Safe to replay (idempotent).
 */
export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("[webhook/clerk] CLERK_WEBHOOK_SECRET not configured");
    return jsonResponse(
      { success: false, error: "Webhook secret not configured" },
      500
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse(
      { success: false, error: "Missing svix headers" },
      400
    );
  }

  const payload: unknown = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return jsonResponse(
      { success: false, error: "Webhook verification failed" },
      400
    );
  }

  switch (evt.type) {
    case "user.created":
      return handleUserCreated(evt.data);
    case "user.updated":
      return handleUserUpdated(evt.data);
    case "user.deleted":
      return handleUserDeleted(evt.data);
    default:
      return jsonResponse({ success: true });
  }
}

// ── User Events ────────────────────────────────────────────────────

async function handleUserCreated(data: WebhookEvent["data"]) {
  const d = data as unknown as Record<string, unknown>;
  const clerkId = d.id as string;
  const emailAddresses = d.email_addresses as
    | Array<{ email_address: string }>
    | undefined;
  const primaryEmail = emailAddresses?.[0]?.email_address;

  if (!primaryEmail) {
    console.error("[webhook/clerk] user.created — no email in payload", {
      clerkId,
    });
    return jsonResponse(
      { success: false, error: "No email address in payload" },
      400
    );
  }

  // Idempotent: skip if already exists by clerkId
  const existingByClerkId = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (existingByClerkId) {
    return jsonResponse({ success: true });
  }

  const name =
    [d.first_name, d.last_name].filter(Boolean).join(" ") || null;
  const avatarUrl = (d.image_url as string | null) ?? null;

  // Link to pre-seeded user if email matches
  const existingByEmail = await prisma.user.findUnique({
    where: { email: primaryEmail },
    select: { id: true },
  });

  if (existingByEmail) {
    await prisma.user.update({
      where: { email: primaryEmail },
      data: { clerkId, name: name ?? undefined, avatarUrl: avatarUrl ?? undefined },
    });
  } else {
    await prisma.user.create({
      data: { clerkId, email: primaryEmail, name, avatarUrl },
    });
  }

  return jsonResponse({ success: true });
}

async function handleUserUpdated(data: WebhookEvent["data"]) {
  const d = data as unknown as Record<string, unknown>;
  const clerkId = d.id as string;
  const emailAddresses = d.email_addresses as
    | Array<{ email_address: string }>
    | undefined;
  const primaryEmail = emailAddresses?.[0]?.email_address;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (!user) return jsonResponse({ success: true });

  const name =
    [d.first_name, d.last_name].filter(Boolean).join(" ") || null;

  await prisma.user.update({
    where: { clerkId },
    data: {
      name: name ?? user.name,
      avatarUrl: (d.image_url as string | null) ?? user.avatarUrl,
      ...(primaryEmail ? { email: primaryEmail } : {}),
    },
  });

  return jsonResponse({ success: true });
}

async function handleUserDeleted(data: WebhookEvent["data"]) {
  const d = data as unknown as Record<string, unknown>;
  const clerkId = d.id as string;

  // Cascade deletes handle org memberships
  await prisma.user.deleteMany({ where: { clerkId } });

  return jsonResponse({ success: true });
}
