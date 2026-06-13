// Hardcoded credentials per challenge spec.
// NOTE: this is intentionally client-side; the spec forbids a custom backend.
const USERNAME = "intern@namlotech.com";
const PASSWORD = "namlo2026";
const KEY = "namlo_auth_v1";

export function signIn(username: string, password: string): boolean {
  if (username.trim().toLowerCase() === USERNAME && password === PASSWORD) {
    sessionStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function signOut() {
  sessionStorage.removeItem(KEY);
}

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEY) === "1";
}
