"use client";

import { RoleGuard } from "@/components/layouts/role-guard";
import { HrmsShell } from "@/components/layouts/hrms-shell";
import { useMeQuery, useOffboardingMeQuery } from "@/lib/query/hooks";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const me = useMeQuery();
  const offboarding = useOffboardingMeQuery();
  const pathname = usePathname();
  const router = useRouter();

  const offboardingRestricted = Boolean(offboarding.data);

  useEffect(() => {
    if (!offboardingRestricted) return;

    const restrictedPath = pathname.startsWith("/employee") ? "/employee/offboarding" : "/portal/offboarding";

    if (pathname !== restrictedPath) {
      router.replace(restrictedPath);
    }
  }, [offboardingRestricted, pathname, router]);

  return (
    <RoleGuard role="EMPLOYEE">
      <HrmsShell role="EMPLOYEE" user={me.data} offboardingRestricted={offboardingRestricted}>
        {children}
      </HrmsShell>
    </RoleGuard>
  );
}
