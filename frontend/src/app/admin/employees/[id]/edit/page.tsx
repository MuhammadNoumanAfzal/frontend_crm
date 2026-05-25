"use client";

import { useParams, useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/employees/employee-form";
import { useEmployeeOverviewQuery, useEmployeesQuery } from "@/lib/query/hooks";

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const employeeId = typeof params.id === "string" ? params.id : "";

  const employeeQuery = useEmployeeOverviewQuery(employeeId);
  const managersQuery = useEmployeesQuery({ page: 1, limit: 200, is_active: true, sort_by: "name", sort_order: "asc" });

  if (!employeeId || employeeQuery.isLoading || managersQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (!employeeQuery.data?.employee) {
    return (
      <div className="space-y-4 rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Employee data not found.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/employees")}>
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Update profile, role, salary, bank, and visa information safely.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/employees")}>
          Back to Employees
        </Button>
      </div>

      <EmployeeForm
        mode="edit"
        initialData={employeeQuery.data.employee}
        managers={(managersQuery.data?.data ?? []).filter((item) => item.id !== employeeId)}
        onSaved={() => router.push("/admin/employees")}
      />
    </div>
  );
}
