"use client";

import {
  Bar,
  BarChart,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useEmployeeDashboardQuery } from "@/lib/query/hooks";
import Link from "next/link";
import {
  CalendarClockIcon,
  LandmarkIcon,
  Laptop2Icon,
  PartyPopperIcon,
} from "lucide-react";

function formatAed(value: number) {
  return `AED ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function PortalHomePage() {
  const dashboard = useEmployeeDashboardQuery();

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
        </CardContent>
      </Card>
    );
  }

  const { kpi, charts, recent_activity: recentActivity, assigned_assets: assignedAssets, next_holiday: nextHoliday } =
    dashboard.data;

  const leaveTakenChartConfig = {
    days_taken: { label: "Days taken", color: "#d24726" },
  } as const satisfies ChartConfig;

  const leaveBalanceChartConfig: ChartConfig = Object.fromEntries(
    charts.leave_balance_breakdown.map((item, index) => [
      item.type,
      {
        label: item.type,
        color: chartPalette[index % chartPalette.length],
      },
    ]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My dashboard</h1>
          <p className="text-sm text-muted-foreground">Your HR overview for leave, payroll, and assigned assets.</p>
        </div>
        {/* <div className="flex overflow-hidden rounded-md border border-border/70">
          <Link href="/admin" className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
            Admin
          </Link>
          <Link href="/employee/dashboard" className="bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            Employee
          </Link>
        </div> */}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Annual leave left"
          value={`${kpi.annual_leave_left_days} days`}
          icon={CalendarClockIcon}
        />
        <StatCard
          title="Net salary (last period)"
          value={formatAed(kpi.net_salary_last_month_aed)}
          hint={kpi.net_salary_period ?? "No payroll yet"}
          icon={LandmarkIcon}
        />
        <StatCard title="Assets assigned" value={kpi.assets_assigned} icon={Laptop2Icon} />
        <StatCard
          title="Next public holiday"
          value={kpi.days_until_next_holiday !== null ? `${kpi.days_until_next_holiday} days` : "-"}
          hint={nextHoliday ? `${nextHoliday.name} · ${formatDate(nextHoliday.date)}` : "No upcoming holiday"}
          icon={PartyPopperIcon}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="rounded-xl border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              My leave taken (last 6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer id="employee-leave-taken" config={leaveTakenChartConfig} className="h-[220px] w-full">
              <BarChart data={charts.leave_taken_trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-muted/50" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={chartTooltipCursor} />
                <Bar dataKey="days_taken" fill="var(--color-days_taken)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Leave balance by type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer id="employee-leave-balance" config={leaveBalanceChartConfig} className="h-[220px] w-full">
              <PieChart margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="type" />} />
                <Pie
                  data={charts.leave_balance_breakdown}
                  dataKey="remaining"
                  nameKey="type"
                  innerRadius="56%"
                  outerRadius="78%"
                  strokeWidth={2}
                  stroke="var(--background)"
                  paddingAngle={2}
                  cornerRadius={4}
                >
                  {charts.leave_balance_breakdown.map((entry, index) => (
                    <Cell key={entry.type} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="type" />} verticalAlign="bottom" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="rounded-xl border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              My recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.slice(0, 4).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm text-foreground">{activity.description}</p>
                  <p className="text-[11px] text-muted-foreground">{relativeTime(activity.timestamp)}</p>
                </div>
                <Badge variant={activity.status === "APPROVED" || activity.status === "PAID" ? "default" : "secondary"}>
                  {activity.status}
                </Badge>
              </div>
            ))}
            {recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">My assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignedAssets.slice(0, 4).map((asset) => (
              <div key={asset.id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {asset.asset_tag ?? asset.serial_no}
                    {asset.category ? ` · ${asset.category}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">{asset.status}</Badge>
              </div>
            ))}
            {assignedAssets.length === 0 ? <p className="text-sm text-muted-foreground">No assigned assets.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
