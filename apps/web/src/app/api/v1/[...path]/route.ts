import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ path: string[] }> };

const requestHeaderNames = [
  "accept",
  "content-type",
  "cookie",
  "origin",
  "x-csrf-token",
  "idempotency-key",
] as const;

function safePath(path: string[]): string | null {
  if (path.length === 0 || path.some((segment) =>
    !segment || segment === "." || segment === ".." || /[/\\\0]/.test(segment)
  )) return null;
  return path.map(encodeURIComponent).join("/");
}

async function forward(request: NextRequest, context: Context): Promise<Response> {
  const path = safePath((await context.params).path);
  if (!path) return Response.json({ error: { code: "BAD_QUERY", message: "Invalid API path.", fields: {} } }, { status: 400 });

  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl) return Response.json({ error: { code: "SERVICE_UNAVAILABLE", message: "API is unavailable.", fields: {} } }, { status: 503 });

  let upstreamUrl: URL;
  try {
    const base = new URL(internalUrl);
    if (!(["http:", "https:"].includes(base.protocol)) || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error("Invalid API_INTERNAL_URL");
    upstreamUrl = new URL(`/api/v1/${path}${request.nextUrl.search}`, base);
  } catch {
    return Response.json({ error: { code: "SERVICE_UNAVAILABLE", message: "API is unavailable.", fields: {} } }, { status: 503 });
  }

  const headers = new Headers();
  for (const name of requestHeaderNames) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers();
    for (const name of ["content-type", "cache-control", "content-disposition", "referrer-policy"]) {
      const value = upstream.headers.get(name);
      if (value !== null) responseHeaders.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: { code: "SERVICE_UNAVAILABLE", message: "API is unavailable.", fields: {} } }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
