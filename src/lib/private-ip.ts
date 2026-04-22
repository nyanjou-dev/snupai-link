import { promises as dns } from "node:dns";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.azure.com",
]);

function ipv4ToBytes(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const bytes: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255 || String(n) !== p) return null;
    bytes.push(n);
  }
  return bytes as [number, number, number, number];
}

function isPrivateIPv4(ip: string): boolean {
  const b = ipv4ToBytes(ip);
  if (!b) return false;
  if (b[0] === 10) return true; // 10.0.0.0/8
  if (b[0] === 172 && b[1] >= 16 && b[1] <= 31) return true; // 172.16.0.0/12
  if (b[0] === 192 && b[1] === 168) return true; // 192.168.0.0/16
  if (b[0] === 127) return true; // 127.0.0.0/8 (loopback)
  if (b[0] === 169 && b[1] === 254) return true; // 169.254.0.0/16 (link-local incl. AWS/GCP metadata)
  if (b[0] === 0) return true; // 0.0.0.0/8
  if (b[0] === 100 && b[1] >= 64 && b[1] <= 127) return true; // 100.64.0.0/10 (CGNAT)
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  const mapped = normalized.match(/^::ffff:([0-9.]+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true; // fc00::/7 ULA
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) return true; // fe80::/10 link-local
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) return isPrivateIPv4(ip);
  if (fam === 6) return isPrivateIPv6(ip);
  return false;
}

export async function hostnameResolvesToPrivate(hostname: string): Promise<boolean> {
  const lowered = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lowered)) return true;
  if (lowered.endsWith(".local") || lowered.endsWith(".internal")) return true;

  if (isIP(hostname)) return isPrivateIp(hostname);

  try {
    const results = await dns.lookup(hostname, { all: true });
    for (const r of results) {
      if (isPrivateIp(r.address)) return true;
    }
    return false;
  } catch {
    // Resolution failure — treat as blocked (fail closed).
    return true;
  }
}
