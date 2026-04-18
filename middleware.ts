import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const protectedPrefixes = [
  "/home",
  "/workout",
  "/log",
  "/sleep",
  "/prs",
  "/settings",
  "/onboarding",
  "/dashboard",
  "/workouts",
  "/measurements",
];

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  let user = null as null | { id: string };
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthArea = path.startsWith("/auth");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (isAuthArea && user && (path === "/auth/login" || path === "/auth/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|sw.js|workbox|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
