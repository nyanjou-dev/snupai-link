import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

// PKCS8 PEM is multi-line; @convex-dev/auth + jose accept the file with
// newlines collapsed to spaces. Prefer piping the raw value via stdin to
// avoid shell quoting subtleties, e.g.:
//   printf '%s' "$JWT_PRIVATE_KEY" | bunx convex env set JWT_PRIVATE_KEY
process.stdout.write(
  `JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"\n`
);
process.stdout.write(`JWKS=${jwks}\n`);
