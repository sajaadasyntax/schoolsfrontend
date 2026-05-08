import { UserProfile } from "./api";

const USER_KEY = "school_user";

export function saveUser(user: UserProfile) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function clearUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY);
  }
}
