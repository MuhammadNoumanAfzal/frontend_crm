import type { LucideIcon } from "lucide-react";
import {
  BarChart3Icon,
  BadgeAlertIcon,
  BriefcaseBusinessIcon,
  CalendarClockIcon,
  FileTextIcon,
  LayoutDashboard,
  LandmarkIcon,
  Laptop2Icon,
  MessageSquareIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserCircle2Icon,
  UserMinusIcon,
  UsersIcon,
} from "lucide-react";
import type { Role } from "@/lib/api/types";

export type NavSubItem = { href: string; label: string };

export type NavEntry =
  | {
      href: string;
      label: string;
      icon: LucideIcon;
    }
  | {
      label: string;
      icon: LucideIcon;
      items: NavSubItem[];
    };

export const adminNav: NavEntry[] = [
  { href: "/admin", label: "Dashboard", icon: ShieldCheckIcon },
  {
    label: "Employees",
    icon: UsersIcon,
    items: [
      { href: "/admin/employees", label: "Directory" },
      { href: "/admin/employees/new", label: "Add New Employee" },
    ],
  },
  { href: "/admin/payroll", label: "Payroll", icon: LandmarkIcon },
  { href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3Icon },
  { href: "/admin/leaves", label: "Leave management", icon: CalendarClockIcon },
  { href: "/admin/assets", label: "Assets", icon: Laptop2Icon },
  { href: "/admin/visa", label: "Visa", icon: BadgeAlertIcon },
  { href: "/admin/recruitment", label: "Recruitment", icon: BriefcaseBusinessIcon },
  { href: "/admin/offboarding", label: "Offboarding", icon: UserMinusIcon },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareIcon },
  { href: "/admin/settings", label: "Global Settings", icon: SettingsIcon },
];

export const employeeNav: NavEntry[] = [
  { href: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employee/onboarding", label: "Onboarding", icon: BriefcaseBusinessIcon },
  { href: "/employee/offboarding", label: "Offboarding", icon: UserMinusIcon },
  { href: "/employee/profile", label: "My Profile", icon: UserCircle2Icon },
  { href: "/employee/documents", label: "My Documents", icon: FileTextIcon },
  { href: "/employee/leaves", label: "My Leave", icon: CalendarClockIcon },
  { href: "/employee/payslips", label: "My Payslips", icon: LandmarkIcon },
  { href: "/employee/assets", label: "My Assets", icon: Laptop2Icon },
  { href: "/employee/feedback", label: "Feedback", icon: MessageSquareIcon },
];

export function navForRole(role: Role, options?: { offboardingRestricted?: boolean; currentPath?: string }): NavEntry[] {
  if (role === "ADMIN") return adminNav;

  const isPortalNamespace = options?.currentPath?.startsWith("/portal") ?? false;

  const employeeRoutes: NavEntry[] = isPortalNamespace
    ? [
        { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
        { href: "/portal/onboarding", label: "Onboarding", icon: BriefcaseBusinessIcon },
        { href: "/portal/offboarding", label: "Offboarding", icon: UserMinusIcon },
        { href: "/portal/profile", label: "My Profile", icon: UserCircle2Icon },
        { href: "/portal/documents", label: "My Documents", icon: FileTextIcon },
        { href: "/portal/leaves", label: "My Leave", icon: CalendarClockIcon },
        { href: "/portal/payroll", label: "My Payslips", icon: LandmarkIcon },
        { href: "/portal/assets", label: "My Assets", icon: Laptop2Icon },
        { href: "/portal/feedback", label: "Feedback", icon: MessageSquareIcon },
      ]
    : employeeNav;

  if (options?.offboardingRestricted) {
    return [
      {
        href: isPortalNamespace ? "/portal/offboarding" : "/employee/offboarding",
        label: "Offboarding",
        icon: UserMinusIcon,
      },
    ];
  }

  return employeeRoutes;
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/portal" || href === "/employee/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
