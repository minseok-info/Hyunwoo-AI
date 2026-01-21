import { NextRequest, NextResponse } from "next/server";

const middleware = (req: NextRequest) => {
  const auth = req.cookies.get("access_token");

  if (!auth) {
    return NextResponse.redirect(
      new URL("/signIn", req.url)
    );
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/admin/:path*"]
};

export default middleware;