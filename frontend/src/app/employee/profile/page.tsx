"use client";

import { useEffect, useMemo, useRef } from "react";
import { z } from "zod/v4";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmployeeStatusBadge } from "@/components/employees/employee-status-badge";
import {
  useEmployeeAvatarUpdateMutation,
  useEmployeeChangePasswordMutation,
  useEmployeeProfileQuery,
  useEmployeeProfileUpdateMutation,
} from "@/lib/query/hooks";
import { CameraIcon, KeyRoundIcon, SaveIcon, ShieldCheckIcon } from "lucide-react";

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function initials(name: string) {
  const value = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return value || "EM";
}

const profileSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  personal_email: z.email("Invalid personal email").or(z.literal("")),
  phone: z.string().max(30, "Phone is too long"),
  emergency_contact_name: z.string().max(120, "Emergency contact name is too long"),
  emergency_phone: z.string().max(30, "Emergency phone is too long"),
  address: z.string().max(500, "Address is too long"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(6, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function EmployeeProfilePage() {
  const profileQuery = useEmployeeProfileQuery();
  const updateProfile = useEmployeeProfileUpdateMutation();
  const updateAvatar = useEmployeeAvatarUpdateMutation();
  const changePassword = useEmployeeChangePasswordMutation();
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    defaultValues: {
      full_name: "",
      personal_email: "",
      phone: "",
      emergency_contact_name: "",
      emergency_phone: "",
      address: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    if (!profileQuery.data) return;

    profileForm.reset({
      full_name: profileQuery.data.full_name ?? "",
      personal_email: profileQuery.data.employee_data?.personal_email ?? "",
      phone: profileQuery.data.employee_data?.phone ?? "",
      emergency_contact_name: profileQuery.data.employee_data?.emergency_contact_name ?? "",
      emergency_phone: profileQuery.data.employee_data?.emergency_phone ?? "",
      address: profileQuery.data.employee_data?.address ?? "",
    });
  }, [profileForm, profileQuery.data]);

  const displayName = profileQuery.data?.full_name ?? "Employee";
  const avatarSource = profileQuery.data?.avatar_url ?? "/images/user-default.avif";
  const readOnlyDetails = useMemo(
    () => [
      { label: "Employee code", value: profileQuery.data?.employee_data?.employee_code ?? "-" },
      { label: "Department", value: profileQuery.data?.employee_data?.department ?? "-" },
      { label: "Designation", value: profileQuery.data?.employee_data?.designation ?? "-" },
      {
        label: "Employment type",
        value: profileQuery.data?.employee_data?.employment_type?.replace("_", " ") ?? "-",
      },
      { label: "Joining date", value: formatDate(profileQuery.data?.employee_data?.joining_date) },
      {
        label: "Contract end date",
        value: formatDate(profileQuery.data?.employee_data?.contract_end_date ?? null),
      },
      { label: "Official email", value: profileQuery.data?.email ?? "-" },
    ],
    [profileQuery.data],
  );

  if (profileQuery.isLoading) {
    return <PageSkeleton />;
  }

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid profile data");
      return;
    }

    try {
      await updateProfile.mutateAsync(parsed.data);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    }
  });

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
    const parsed = passwordSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password data");
      return;
    }

    try {
      await changePassword.mutateAsync(parsed.data);
      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change password");
    }
  });

  const handleAvatarFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await updateAvatar.mutateAsync(file);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile photo");
    } finally {
      event.currentTarget.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Manage your personal details and account security.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-16 rounded-xl border border-border/70 bg-background">
                <AvatarImage src={avatarSource} alt={displayName} className="rounded-xl" />
                <AvatarFallback>{initials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-semibold leading-none">{displayName}</p>
                <p className="text-xs text-muted-foreground">{profileQuery.data?.email}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={updateAvatar.isPending}
                  onClick={() => avatarFileInputRef.current?.click()}
                >
                  <CameraIcon className="mr-2 size-4" />
                  {updateAvatar.isPending ? "Uploading..." : "Change photo"}
                </Button>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarFile}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Employment status</p>
              <EmployeeStatusBadge status={profileQuery.data?.employment_status ?? "ACTIVE"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheckIcon className="size-4" />
              Employment Details (Read-only)
            </CardTitle>
            <CardDescription>These fields are managed by HR and cannot be edited from this page.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {readOnlyDetails.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/70 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="truncate text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

            <div className="grid gap-4 md:grid-cols-3">

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal, contact, and emergency details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name">
                <Input {...profileForm.register("full_name")} />
              </Field>
              <Field label="Personal email">
                <Input type="email" {...profileForm.register("personal_email")} />
              </Field>
              <Field label="Phone number">
                <Input {...profileForm.register("phone")} />
              </Field>
              <Field label="Emergency contact name">
                <Input {...profileForm.register("emergency_contact_name")} />
              </Field>
              <Field label="Emergency phone">
                <Input {...profileForm.register("emergency_phone")} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Address">
                  <Textarea rows={3} {...profileForm.register("address")} />
                </Field>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending}>
                <SaveIcon className="mr-2 size-4" />
                {updateProfile.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4" />
            Change Password
          </CardTitle>
          <CardDescription>Use a strong password with at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 " onSubmit={handlePasswordSubmit}>
            <Field label="Current password">
              <Input type="password" autoComplete="current-password" {...passwordForm.register("current_password")} />
            </Field>
            <Field label="New password">
              <Input type="password" autoComplete="new-password" {...passwordForm.register("new_password")} />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" autoComplete="new-password" {...passwordForm.register("confirm_password")} />
            </Field>

            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" variant="outline" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
