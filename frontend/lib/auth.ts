import Cookies from "js-cookie";
import { User, AuthState } from "@/types";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function saveAuth(token: string, user: User): void {
  Cookies.set(TOKEN_KEY, token, { expires: 1, sameSite: "lax" });
  Cookies.set(USER_KEY, JSON.stringify(user), { expires: 1, sameSite: "lax" });
}

export function getAuth(): AuthState {
  const token = Cookies.get(TOKEN_KEY) ?? null;
  const userStr = Cookies.get(USER_KEY);
  const user: User | null = userStr ? JSON.parse(userStr) : null;
  return { token, user };
}

export function clearAuth(): void {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!Cookies.get(TOKEN_KEY);
}

export function getUser(): User | null {
  const userStr = Cookies.get(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

export function getRoleHome(role: string): string {
  switch (role) {
    case "DOCTOR":
    case "GASTROENTEROLOGIST":
    case "HEPATOLOGIST":
      return "/doctor/dashboard";
    case "NURSE":
      return "/nurse/intake";
    case "ADMIN":
      return "/admin/dashboard";
    case "REFERRING_PHYSICIAN":
      return "/doctor/dashboard";
    case "RESEARCHER":
      return "/analytics";
    default:
      return "/auth/login";
  }
}

export function isClinicalRole(role: string): boolean {
  return [
    "DOCTOR",
    "GASTROENTEROLOGIST",
    "HEPATOLOGIST",
    "NURSE",
    "ADMIN",
    "REFERRING_PHYSICIAN",
  ].includes(role);
}

export function isSpecialistRole(role: string): boolean {
  return ["DOCTOR", "GASTROENTEROLOGIST", "HEPATOLOGIST"].includes(role);
}
