import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// Magic byte signatures for allowed file types
const MAGIC_BYTES: Array<{ type: string; signature: number[]; offset?: number }> = [
  { type: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
  { type: "image/png", signature: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/webp", signature: [0x52, 0x49, 0x46, 0x46] }, // RIFF header (WEBP follows at offset 8)
  { type: "image/gif", signature: [0x47, 0x49, 0x46, 0x38] },
  { type: "application/pdf", signature: [0x25, 0x50, 0x44, 0x46] },
];

function detectMimeType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  for (const { type, signature } of MAGIC_BYTES) {
    const match = signature.every((byte, i) => bytes[i] === byte);
    if (match) {
      // Extra check for WebP: bytes 8-11 must be "WEBP"
      if (type === "image/webp") {
        const isWebP =
          bytes[8] === 0x57 &&
          bytes[9] === 0x45 &&
          bytes[10] === 0x42 &&
          bytes[11] === 0x50;
        if (!isWebP) continue;
      }
      return type;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // Auth check — require signed-in user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user has ADMIN role in at least one org
    const membership = await prisma.orgMember.findFirst({
      where: { userId, role: { in: ["ADMIN", "OWNER"] } },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, data: null, error: "Admin role required" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, data: null, error: "No file provided" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, data: null, error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // Read the file buffer and validate magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const mimeType = detectMimeType(arrayBuffer);

    if (!mimeType) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Invalid file type. Only JPEG, PNG, WebP, GIF, and PDF are allowed.",
        },
        { status: 400 }
      );
    }

    // Generate a safe filename
    const originalName =
      file instanceof File ? file.name : "upload";
    const ext = originalName.split(".").pop() ?? "bin";
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    const timestamp = Date.now();
    const filename = `uploads/${timestamp}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    // Upload to Vercel Blob
    const blob = await put(filename, arrayBuffer, {
      access: "public",
      contentType: mimeType,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
        size: file.size,
        type: mimeType,
      },
      error: null,
    });
  } catch (err) {
    console.error("[Upload error]", err);
    return NextResponse.json(
      { success: false, data: null, error: "Upload failed" },
      { status: 500 }
    );
  }
}
