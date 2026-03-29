import { NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { success: false, data: null, error: message },
        { status: 400 }
      );
    }

    const { name, email, message } = parsed.data;

    // In production, send via Resend or similar email service.
    // For now, log to console as a safe fallback.
    console.log("[Contact form submission]", { name, email, message });

    return NextResponse.json({
      success: true,
      data: { received: true },
      error: null,
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
