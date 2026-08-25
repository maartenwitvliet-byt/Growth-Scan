import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLoginRoute = pathname === "/beheer/login" || pathname === "/api/beheer/login";
  const isProtected =
    (pathname.startsWith("/beheer") && !isLoginRoute) || (pathname.startsWith("/api/content") && !isLoginRoute);

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const valid = await verifySessionToken(token);

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }
    const loginUrl = new URL("/beheer/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/beheer/:path*", "/api/content/:path*"],
};
