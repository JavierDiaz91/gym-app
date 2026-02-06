const SESSION_COOKIE = "session";
const SESSION_SECRET = process.env.SESSION_SECRET;

export type SessionData = {
  id: number;
  email: string;
  role: "admin" | "trainer" | "member";
  name?: string;
};

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is not set");
}

const encoder = new TextEncoder();

function base64UrlEncode(input: Uint8Array | string) {
  if (typeof input === "string") {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(input, "utf8").toString("base64url");
    }
    return btoa(input)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(input).toString("base64url");
  }

  const binary = Array.from(input, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "base64url").toString("utf8");
  }

  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function encodeSession(session: SessionData) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function decodeSession(value: string): Promise<SessionData | null> {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await sign(payload);
  if (signature !== expectedSignature) return null;

  try {
    return JSON.parse(base64UrlDecode(payload)) as SessionData;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
