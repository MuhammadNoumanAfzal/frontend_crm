import { jwtDecode } from "jwt-decode";
import type { Role } from "@/lib/api/types";

const TOKEN_KEY = "hrms_access_token";

type DecodedToken = {
  userId: string;
  role: Role;
  exp: number;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getDecodedToken(token: string | null) {
  if (!token) return null;

  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
}

export function getSessionRole() {
  const decoded = getDecodedToken(getToken());
  if (!decoded) return null;

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp < now) {
    clearToken();
    return null;
  }

  return decoded.role;
}
