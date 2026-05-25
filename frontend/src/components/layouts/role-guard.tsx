"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSessionRole } from "@/lib/auth/session";
import type { Role } from "@/lib/api/types";

export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sessionRole = getSessionRole();

    if (!sessionRole) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (sessionRole !== role) {
      router.replace(sessionRole === "ADMIN" ? "/admin" : "/portal");
    }
  }, [role, router, pathname]);

  return <>{children}</>;
}
