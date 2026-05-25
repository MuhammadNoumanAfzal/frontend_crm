"use client";

import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/employees/employee-form";
import { useEmployeesQuery } from "@/lib/query/hooks";

export default function AddEmployeePage() {
  const router = useRouter();
  const managersQuery = useEmployeesQuery({ page: 1, limit: 200, is_active: true, sort_by: "name", sort_order: "asc" });

  if (managersQuery.isPending) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create employee profile, payroll profile, and compliance fields in one flow.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/employees")}>
          Back to Employees
        </Button>
      </div>

      <EmployeeForm
        mode="create"
        managers={managersQuery.data?.data ?? []}
        onSaved={() => router.push("/admin/employees")}
      />
    </div>
  );
}

