import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/about(.*)",
  "/contact(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/public(.*)",
  "/:orgSlug/donate(.*)",
  "/:orgSlug/events(.*)",
  "/:orgSlug/campaigns(.*)",
  "/:orgSlug/store(.*)",
]);

/**
 * Returns true when the request originates from a custom domain
 * (not the platform's own domain). Custom domains host the same
 * Next.js app — DNS/routing is handled at the Vercel layer.
 */
function isCustomDomain(req: NextRequest): boolean {
  const host = req.headers.get("host") ?? "";
  const platformDomain =
    process.env.NEXT_PUBLIC_APP_DOMAIN ??
    process.env.VERCEL_URL ??
    "localhost";
  const hostname = host.split(":")[0] ?? "";
  return (
    hostname !== "localhost" &&
    !hostname.endsWith(".vercel.app") &&
    !hostname.endsWith(platformDomain) &&
    hostname !== platformDomain
  );
}

export default clerkMiddleware(async (auth, req) => {
  // Custom-domain pass-through: set x-custom-domain header for downstream pages
  if (isCustomDomain(req)) {
    const host = (req.headers.get("host") ?? "").split(":")[0] ?? "";
    const res = NextResponse.next();
    res.headers.set("x-custom-domain", host);
    res.headers.set("x-pathname", req.nextUrl.pathname);
    return res;
  }

  const skipAuth = process.env.SKIP_AUTH === "true";
  if (!skipAuth && !isPublicRoute(req)) {
    await auth.protect();
  }

  const res = NextResponse.next();
  res.headers.set("x-pathname", req.nextUrl.pathname);
  return res;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
