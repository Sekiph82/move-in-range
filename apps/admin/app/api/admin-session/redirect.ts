import { NextRequest, NextResponse } from "next/server";

export function adminRedirect(request: NextRequest, path: string) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "") ?? "http";
  return NextResponse.redirect(`${protocol}://${host}${path}`, 303);
}
