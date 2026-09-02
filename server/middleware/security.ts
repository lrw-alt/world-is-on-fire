/**
 * Security middleware to prevent direct exposure of configuration and internal files.
 */
interface SecurityEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

const DENIED_PATHS = new Set([
  "/firebase-applet-config.json",
  "/firebase-blueprint.json",
  "/firestore.rules",
  "/security_spec.md",
  "/package.json",
  "/tsconfig.json",
  "/.env",
  "/.env.example",
  "/bun.lock",
  "/bunfig.toml",
]);

export default async function securityMiddleware(
  event: SecurityEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const path = event.url.pathname.toLowerCase();
  if (DENIED_PATHS.has(path) || path.startsWith("/.grok") || path.startsWith("/.agents") || path.startsWith("/migrations")) {
    return new Response(JSON.stringify({ error: "Forbidden: Direct access to configuration files is restricted." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return next();
}
