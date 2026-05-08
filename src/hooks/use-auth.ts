"use client";

import { useState, useEffect } from "react";
import { UserProfile } from "@/lib/api";
import { getUser } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getUser();
    setUser(stored);
    setLoading(false);
  }, []);

  return { user, loading };
}
