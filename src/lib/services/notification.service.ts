/**
 * Notification service for ZedImpact.
 * Handles create, list, and mark-read operations on Notification records.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import { NotFoundError } from "@/lib/org-auth";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ListNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

// ── Functions ──────────────────────────────────────────────────────────────

/**
 * Creates a notification record for a user within an org.
 */
export async function createNotification(
  orgId: string,
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  return withOrgContext(orgId, () =>
    prisma.notification.create({
      data: {
        organizationId: orgId,
        userId,
        type,
        title,
        message,
        metadata: metadata ?? undefined,
      },
    })
  );
}

/**
 * Returns paginated notifications for a user, newest first.
 * Optionally filters to unread only.
 */
export async function listNotifications(
  orgId: string,
  userId: string,
  opts: ListNotificationsOptions = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  return withOrgContext(orgId, async () => {
    const where: Record<string, unknown> = { userId };
    if (opts.unreadOnly) where.read = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, meta: { page, limit, total } };
  });
}

/**
 * Marks a single notification as read.
 */
export async function markRead(
  orgId: string,
  userId: string,
  notificationId: string
) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) throw new NotFoundError("Notification not found");

    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
  });
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllRead(orgId: string, userId: string) {
  return withOrgContext(orgId, () =>
    prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    })
  );
}
