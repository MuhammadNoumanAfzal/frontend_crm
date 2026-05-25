"use client";

import { RoleGuard } from "@/components/layouts/role-guard";
import { HrmsShell } from "@/components/layouts/hrms-shell";
import { useMeQuery } from "@/lib/query/hooks";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = useMeQuery();

  return (
    <RoleGuard role="ADMIN">
      <HrmsShell role="ADMIN" user={me.data}>
        {children}
      </HrmsShell>
    </RoleGuard>
  );
}
