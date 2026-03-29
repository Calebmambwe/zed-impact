import { NextResponse } from "next/server";
import { z } from "zod";

const newsletterSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { success: false, data: null, error: message },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // In production, subscribe via Resend Audiences or Mailchimp.
    console.log("[Newsletter signup]", { email });

    return NextResponse.json({
      success: true,
      data: { subscribed: true },
      error: null,
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
