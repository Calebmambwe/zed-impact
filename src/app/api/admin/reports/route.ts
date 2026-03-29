/**
 * POST /api/admin/reports
 * Generates an AI report. Streams output via SSE.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, requireOrgRole, errorResponse } from "@/lib/org-auth";

const reportSchema = z.object({
  orgId: z.string().min(1),
  reportType: z.enum(["IMPACT", "FINANCIAL", "SPONSORSHIP", "ENGAGEMENT"]),
  dateRange: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional(),
});

const REPORT_PROMPTS: Record<string, string> = {
  IMPACT:
    "Generate a comprehensive impact report for this nonprofit organization. Include key achievements, beneficiaries reached, programs delivered, and community outcomes.",
  FINANCIAL:
    "Generate a financial summary report. Include total funds raised, major revenue streams, donation trends, top campaigns, and year-over-year comparisons.",
  SPONSORSHIP:
    "Generate a sponsorship report. Include active sponsorships, new sponsors this period, children supported, sponsorship retention rate, and geographic distribution.",
  ENGAGEMENT:
    "Generate a donor engagement report. Include donor acquisition, retention rates, average gift size, communication open rates, and engagement trends.",
};

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const body: unknown = await req.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    const { orgId, reportType } = parsed.data;
    await requireOrgRole(user.id, orgId, "ADMIN", "MANAGER");

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, data: null, error: "OPENROUTER_API_KEY not configured" },
        { status: 503 }
      );
    }

    const prompt = REPORT_PROMPTS[reportType];

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "You are an expert nonprofit analyst. Generate clear, professional reports with specific metrics and actionable insights.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { success: false, data: null, error: "AI service unavailable" },
        { status: 503 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

            for (const line of lines) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
