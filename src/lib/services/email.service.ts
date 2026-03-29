/**
 * Email service for ZedImpact.
 * Handles transactional + campaign email via Resend.
 * Falls back to console.log if RESEND_API_KEY is not configured.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import type { EmailBlock } from "@/lib/validations/email";

// ── Resend lazy singleton ────────────────────────────────────────────────────

let _resend: import("resend").Resend | null = null;

function getResend(): import("resend").Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) {
    // Dynamic import to avoid instantiation at module load if key is missing
    const { Resend } = require("resend") as typeof import("resend");
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@zedimpact.app";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Record<string, string>;
  organizationId?: string;
  campaignId?: string;
  contactId?: string;
  templateName?: string;
}

// ── Core send ────────────────────────────────────────────────────────────────

/**
 * Sends a single email via Resend and creates an EmailLog record.
 * If RESEND_API_KEY is not set, logs to console and returns a mock message ID.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<string> {
  const resend = getResend();
  let resendId: string | null = null;
  let status = "sent";
  let errorMessage: string | null = null;

  if (!resend) {
    console.log("[email.service] No RESEND_API_KEY — stub send:", {
      to: opts.to,
      subject: opts.subject,
    });
    resendId = `mock-${Date.now()}`;
  } else {
    try {
      const result = await resend.emails.send({
        from: opts.from ?? DEFAULT_FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        replyTo: opts.replyTo,
        tags: opts.tags
          ? Object.entries(opts.tags).map(([name, value]) => ({ name, value }))
          : undefined,
      });

      resendId = result.data?.id ?? null;
    } catch (err) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("[email.service] Resend error:", errorMessage);
    }
  }

  // Log every send attempt
  if (opts.organizationId) {
    await withOrgContext(opts.organizationId, () =>
      prisma.emailLog.create({
        data: {
          organizationId: opts.organizationId!,
          campaignId: opts.campaignId ?? null,
          contactId: opts.contactId ?? null,
          toEmail: opts.to,
          subject: opts.subject,
          template: opts.templateName ?? null,
          status,
          resendId,
          error: errorMessage,
        },
      })
    );
  }

  return resendId ?? `mock-${Date.now()}`;
}

// ── Campaign email ─────────────────────────────────────────────────────────

interface ContactForEmail {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
}

/**
 * Sends a campaign email to a single contact and creates an EmailSend record.
 */
export async function sendCampaignToContact(
  orgId: string,
  campaignId: string,
  contact: ContactForEmail,
  html: string,
  subject: string
): Promise<void> {
  if (!contact.email) return;

  const resendId = await sendEmail({
    to: contact.email,
    subject,
    html,
    organizationId: orgId,
    campaignId,
    contactId: contact.id,
  });

  await withOrgContext(orgId, () =>
    prisma.emailSend.create({
      data: {
        organizationId: orgId,
        campaignId,
        contactId: contact.id,
        resendId,
        status: "SENT",
        sentAt: new Date(),
      },
    })
  );
}

// ── Template resolution ─────────────────────────────────────────────────────

/**
 * Simple {{variable}} interpolation against a template string.
 */
export function resolveTemplate(
  templateName: string,
  variables: Record<string, unknown>
): string {
  return templateName.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = variables[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

// ── Block renderer ───────────────────────────────────────────────────────────

/**
 * Renders an array of email content blocks to an HTML email string.
 * Uses table-based layout for email client compatibility.
 */
export function renderBlocks(blocks: EmailBlock[]): string {
  const rows = blocks.map((block) => {
    const align = block.align ?? "left";

    switch (block.type) {
      case "heading":
        return `
          <tr>
            <td style="padding:24px 40px 8px; text-align:${align};">
              <h1 style="margin:0; font-size:28px; font-weight:700; color:#111827; font-family:sans-serif;">
                ${escapeHtml(block.content)}
              </h1>
            </td>
          </tr>`;

      case "text":
        return `
          <tr>
            <td style="padding:8px 40px; text-align:${align};">
              <p style="margin:0; font-size:16px; line-height:1.6; color:#374151; font-family:sans-serif;">
                ${escapeHtml(block.content)}
              </p>
            </td>
          </tr>`;

      case "button":
        return `
          <tr>
            <td style="padding:16px 40px; text-align:${align};">
              <a href="${block.url ?? "#"}" style="display:inline-block; padding:12px 24px; background-color:#166534; color:#ffffff; text-decoration:none; border-radius:6px; font-size:16px; font-weight:600; font-family:sans-serif;">
                ${escapeHtml(block.content)}
              </a>
            </td>
          </tr>`;

      case "image":
        return `
          <tr>
            <td style="padding:16px 40px; text-align:${align};">
              <img src="${block.url ?? ""}" alt="${escapeHtml(block.alt ?? block.content)}" style="max-width:100%; height:auto; display:block; ${align === "center" ? "margin:0 auto;" : ""}" />
            </td>
          </tr>`;

      case "divider":
        return `
          <tr>
            <td style="padding:16px 40px;">
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:0;" />
            </td>
          </tr>`;

      default:
        return "";
    }
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f9fafb;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; background-color:#f9fafb;">
    <tr>
      <td style="padding:40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${rows.join("")}
          <tr>
            <td style="padding:24px 40px; text-align:center; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:12px; color:#9ca3af; font-family:sans-serif;">
                You're receiving this because you're part of our community.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
