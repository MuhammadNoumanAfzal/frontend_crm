"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { Role, User } from "@/lib/api/types"
import {
  Building2Icon,
  ShieldCheckIcon,
  UsersIcon,
  LandmarkIcon,
  SettingsIcon,
  UserCircle2Icon,
  CalendarClockIcon,
  Laptop2Icon,
  BadgeAlertIcon,
  BriefcaseBusinessIcon,
} from "lucide-react"

const sidebarBaseData = {
  teams: [
    {
      name: "CloserHolic",
      logo: (
        <Building2Icon />
      ),
      plan: "HRMS Enterprise",
    },
  ],
}

const navByRole = {
  ADMIN: [
    { title: "Dashboard", url: "/admin", icon: <ShieldCheckIcon /> },
    {
      title: "Employees",
      url: "/admin/employees",
      icon: <UsersIcon />,
      items: [
        { title: "Directory", url: "/admin/employees" },
        { title: "Add New Employee", url: "/admin/employees/new" },
      ],
    },
    { title: "Payroll", url: "/admin/payroll", icon: <LandmarkIcon /> },
    { title: "Leave", url: "/admin/leaves", icon: <CalendarClockIcon /> },
    { title: "Assets", url: "/admin/assets", icon: <Laptop2Icon /> },
    { title: "Visa", url: "/admin/visa", icon: <BadgeAlertIcon /> },
    { title: "Recruitment", url: "/admin/recruitment", icon: <BriefcaseBusinessIcon /> },
    { title: "Global Settings", url: "/admin/settings", icon: <SettingsIcon /> },
  ],
  EMPLOYEE: [
    { title: "Overview", url: "/portal", icon: <UserCircle2Icon /> },
    { title: "My Profile", url: "/portal/profile", icon: <UserCircle2Icon /> },
    { title: "My Leaves", url: "/portal/leaves", icon: <CalendarClockIcon /> },
    { title: "My Assets", url: "/portal/assets", icon: <Laptop2Icon /> },
  ],
} as const

export function AppSidebar({ role, user, ...props }: React.ComponentProps<typeof Sidebar> & { role: Role; user?: User }) {
  const sidebarUser = {
    name: user?.full_name ?? "Team Member",
    email: user?.email ?? "",
    avatar: user?.avatar_url ?? "/images/user-default.avif",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarBaseData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navByRole[role]} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
