export type TokenPair = {
  access_token: string;
  refresh_token: string;
};

export type TokenStorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
};

export class TokenStore {
  private readonly storage: TokenStorageAdapter;

  constructor(storage: TokenStorageAdapter) {
    this.storage = storage;
  }

  async save(tokens: TokenPair) {
    await this.storage.setItem("access_token", tokens.access_token);
    await this.storage.setItem("refresh_token", tokens.refresh_token);
  }

  async loadAccessToken(nowMs = Date.now()) {
    try {
      const token = await this.storage.getItem("access_token");
      if (!token || isExpiredOrInvalidMirToken(token, nowMs)) return null;
      return token;
    } catch {
      return null;
    }
  }

  async loadRefreshToken() {
    try {
      return await this.storage.getItem("refresh_token");
    } catch {
      return null;
    }
  }

  async clear() {
    await Promise.all([this.storage.deleteItem("access_token"), this.storage.deleteItem("refresh_token")]);
  }
}

export function isExpiredOrInvalidMirToken(token: string, nowMs = Date.now()) {
  try {
    const [prefix, body] = token.split(".");
    if (prefix !== "mir" || !body) return true;
    const json = base64UrlDecode(body);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp !== "number" || payload.exp <= Math.floor(nowMs / 1000);
  } catch {
    return true;
  }
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  if (typeof atob === "function") return atob(base64);
  throw new Error("Base64 decoder unavailable");
}
