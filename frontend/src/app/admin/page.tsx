"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  chartPalette,
  chartTooltipCursor,
  type ChartConfig,
} from "@/components/ui/chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useAdminDashboardQuery } from "@/lib/query/hooks";
import Link from "next/link";
import {
  AlertTriangleIcon,
  Building2Icon,
  CalendarClockIcon,
  LandmarkIcon,
  ShieldAlertIcon,
  UsersIcon,
} from "lucide-react";

function formatAed(value: number) {
  return `AED ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function relativeTime(value: string) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "Now";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - ts) / 60_000));
  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function AdminDashboardPage() {
  const dashboard = useAdminDashboardQuery();

  if (dashboard.isLoading) {
    return <PageSkeleton />;
  }

  if (!dashboard.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load dashboard data right now.</p>
          <Button className="mt-4" onClick={() => dashboard.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { kpi, charts, recent_activity: recentActivity, alerts } = dashboard.data;

  const payrollChartConfig = {
    payroll: { label: "Payroll (AED)", color: "#d24726" },
  } as const satisfies ChartConfig;

  const headcountChartConfig: ChartConfig = Object.fromEntries(
    charts.headcount_by_department.map((item, index) => [
      item.department,
      {
        label: item.department,
        color: chartPalette[index % chartPalette.length],
      },
    ]),
  );

  const roleDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">{roleDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* <div className="flex overflow-hidden rounded-md border border-border/70">
            <Link href="/admin" className="bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Admin
            </Link>
            <Link href="/employee/dashboard" className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              Employee
            </Link>
          </div> */}
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            Unified dashboard payload
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active employees" value={kpi.total_active_employees} icon={UsersIcon} />
        <StatCard
          title="Payroll this month"
          value={formatAed(kpi.payroll_this_month_aed)}
          hint={kpi.payroll_status === "NO_RUN" ? "No payroll run yet" : `Run status: ${kpi.payroll_status}`}
          icon={LandmarkIcon}
        />
        <StatCard
          title="Pending leave requests"
          value={kpi.pending_leave_requests}
          tone={kpi.pending_leave_requests > 0 ? "warning" : "default"}
          icon={CalendarClockIcon}
        />
        <StatCard
          title="Visas expiring in 30 days"
          value={kpi.visas_expiring_30_days}
          tone={kpi.visas_expiring_30_days > 0 ? "danger" : "default"}
          icon={ShieldAlertIcon}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="rounded-xl border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Monthly payroll cost (last 6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer id="admin-payroll-trend" config={payrollChartConfig} className="h-[150px] w-full">
              <AreaChart data={charts.payroll_trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-muted/50" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={chartTooltipCursor} />
                <Area
                  type="monotone"
                  dataKey="payroll"
                  stroke="var(--color-payroll)"
                  fill="var(--color-payroll)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ fill: "var(--color-payroll)", strokeWidth: 0, r: 3 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Headcount by department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer id="admin-headcount" config={headcountChartConfig} className="h-[150px] w-full">
              <PieChart margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="department" />} />
                <Pie
                  data={charts.headcount_by_department}
                  dataKey="count"
                  nameKey="department"
                  innerRadius="56%"
                  outerRadius="78%"
                  strokeWidth={2}
                  stroke="var(--background)"
                  paddingAngle={2}
                  cornerRadius={4}
                >
                  {charts.headcount_by_department.map((entry, index) => (
                    <Cell key={entry.department} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="department" />} verticalAlign="bottom" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="rounded-xl border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-3 rounded-md border border-border/70 px-3 py-2">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {activity.performer_initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{activity.performer_name}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{activity.message}</p>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(activity.timestamp)}</span>
              </div>
            ))}
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map((alert) => {
              const warningClass =
                "border-amber-300/70 bg-amber-50/70 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-200";

              return (
                <Alert
                  key={alert.id}
                  variant={alert.severity === "critical" ? "destructive" : "default"}
                  className={alert.severity === "warning" ? warningClass : undefined}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <AlertTitle className="text-sm">{alert.title}</AlertTitle>
                      <AlertDescription className="text-xs">
                        {alert.description}
                        {typeof alert.due_in_days === "number" ? ` · ${alert.due_in_days} days` : ""}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              );
            })}
            {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No active alerts.</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Building2Icon className="h-3.5 w-3.5" />
        Data freshness: aggregated server-side at {new Date(dashboard.data.generated_at).toLocaleTimeString()}.
      </div>
    </div>
  );
}
