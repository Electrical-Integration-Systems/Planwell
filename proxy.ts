import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type ConvexQueryResult =
  | {
      status: "success";
      value: unknown;
    }
  | {
      status: "error";
      errorMessage: string;
    };

const isSignInPage = createRouteMatcher(["/signin"]);

function normalizeEmail(email: string | null | undefined): string | null {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function parseAllowedEmails(rawValue: string | undefined): Set<string> {
  if (typeof rawValue !== "string") return new Set();
  return new Set(
    rawValue
      .split(/[,\n]/)
      .map((email) => normalizeEmail(email))
      .filter((email): email is string => email !== null),
  );
}

function getNextAllowedEmails(): Set<string> {
  return parseAllowedEmails(process.env.ALLOWED_EMAILS);
}

function redirectToUnauthorized(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/signin";
  url.searchParams.set("error", "unauthorized");
  return NextResponse.redirect(url);
}

function redirectToConfigError(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/signin";
  url.searchParams.set("error", "missing_allowlist");
  return NextResponse.redirect(url);
}

async function isWhitelistedToken(token: string): Promise<boolean> {
  const allowedEmails = getNextAllowedEmails();
  if (allowedEmails.size === 0) return false;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (typeof convexUrl !== "string" || convexUrl.length === 0) return false;

  const response = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Convex-Client": "nextjs-proxy-authz",
    },
    body: JSON.stringify({
      path: "authz:getCurrentUserEmail",
      format: "convex_encoded_json",
      args: [{}],
    }),
    cache: "no-store",
  }).catch(() => null);
  if (response === null || !response.ok) return false;

  const result = (await response.json().catch(() => null)) as ConvexQueryResult | null;
  if (result === null || result.status !== "success") return false;

  const email = normalizeEmail(
    typeof result.value === "string" ? result.value : null,
  );
  if (email === null) return false;

  return allowedEmails.has(email);
}

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (getNextAllowedEmails().size === 0) {
    if (!isSignInPage(request)) {
      return redirectToConfigError(request);
    }
    return;
  }

  const authenticated = await convexAuth.isAuthenticated();
  if (!authenticated) {
    if (!isSignInPage(request)) {
      return nextjsMiddlewareRedirect(request, "/signin");
    }
    return;
  }

  const token = await convexAuth.getToken();
  if (!token) {
    if (!isSignInPage(request)) {
      return nextjsMiddlewareRedirect(request, "/signin");
    }
    return;
  }

  const allowed = await isWhitelistedToken(token);
  if (!allowed) {
    if (!isSignInPage(request)) {
      return redirectToUnauthorized(request);
    }
    return;
  }

  if (isSignInPage(request)) {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
