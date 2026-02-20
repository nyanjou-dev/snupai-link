import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { openidConfiguration } from "./openidDiscovery";

const http = httpRouter();

// Custom OpenID discovery endpoint with token_endpoint
http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: openidConfiguration,
});

// JWKS endpoint required for JWT validation
http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    const jwks = process.env.JWKS;
    if (!jwks) {
      throw new Error("Missing JWKS environment variable");
    }
    return new Response(jwks, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
      },
    });
  }),
});

export default http;
