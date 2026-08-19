"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getCurrentUser, scheduleProactiveRefresh } from "../lib/api-client";

interface Props {
  children: React.ReactNode;
  requiredRole: "ADMIN" | "SCORER" | "SUPER_ADMIN";
}

export function AuthGuard({ children, requiredRole }: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    scheduleProactiveRefresh(token);

    const user = getCurrentUser();
    if (!user || user.role !== requiredRole) {
      router.replace("/login");
      return;
    }
    setChecked(true);

    // No sleep-detection, no idle-timeout — the session stays alive until
    // the person clicks Log Out, the refresh token itself expires (7 days),
    // or a server request comes back unauthorized. Nothing here forces a
    // logout based on tab visibility or time away from the tab.
  }, [router, requiredRole]);

  if (!checked) {
    return (
      <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", color: "var(--cp-text-secondary)" }}>
        Checking session...
      </div>
    );
  }

  return <>{children}</>;
}