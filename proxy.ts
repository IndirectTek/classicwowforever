import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets and generated images; they never need a session.
  matcher: [
    "/((?!_next/static|_next/image|_vercel|icon.svg|robots.txt|sitemap.xml|.*opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf)$).*)",
  ],
};
