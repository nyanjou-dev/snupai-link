import type { AuthConfig } from "convex/server";

const domain = process.env.CONVEX_SITE_URL;
if (typeof domain !== "string" || !domain) {
  throw new Error("CONVEX_SITE_URL must be set for Convex Auth");
}

export default {
  providers: [
    {
      domain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
