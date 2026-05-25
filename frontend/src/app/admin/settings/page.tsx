"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, PlugZap, RefreshCw, Search, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import type { SettingsRoleUser } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMeQuery,
  useSettingsBitrixQuery,
  useSettingsBitrixStatusQuery,
  useSettingsCompanyLogoMutation,
  useSettingsCompanyMutation,
  useSettingsCompanyQuery,
  useSettingsDemoteUserMutation,
  useSettingsPromoteUserMutation,
  useSettingsQuery,
  useSettingsRolesQuery,
  useSettingsTestBitrixMutation,
  useSettingsTriggerBitrixSyncMutation,
} from "@/lib/query/hooks";

type SettingsSection = "company" | "bitrix" | "roles";

type CompanyFormState = {
  company_name: string;
  employer_id: string;
  trade_license_no: string;
  default_bank_agent_code: string;
  wps_account_number: string;
};

const settingsSections: Array<{ id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "company", label: "Company Info", icon: Building2 },
  { id: "bitrix", label: "Bitrix Sync", icon: PlugZap },
  { id: "roles", label: "Roles & Permissions", icon: ShieldCheck },
];

const emptyCompanyForm: CompanyFormState = {
  company_name: "",
  employer_id: "",
  trade_license_no: "",
  default_bank_agent_code: "",
  wps_account_number: "",
};

function renderTimeAgo(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

export default function GlobalSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("company");
  const settingsQ = useSettingsQuery();
  const meQ = useMeQuery();

  const companyQ = useSettingsCompanyQuery();
  const companyMutation = useSettingsCompanyMutation();
  const companyLogoMutation = useSettingsCompanyLogoMutation();
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(emptyCompanyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);

  useEffect(() => {
    if (!companyQ.data) return;
    setCompanyForm({
      company_name: companyQ.data.company_name ?? "",
      employer_id: companyQ.data.employer_id ?? "",
      trade_license_no: companyQ.data.trade_license_no ?? "",
      default_bank_agent_code: companyQ.data.default_bank_agent_code ?? "",
      wps_account_number: companyQ.data.wps_account_number ?? "",
    });
  }, [companyQ.data]);

  const bitrixQ = useSettingsBitrixQuery();
  const bitrixStatusQ = useSettingsBitrixStatusQuery();
  const testBitrix = useSettingsTestBitrixMutation();
  const syncBitrix = useSettingsTriggerBitrixSyncMutation();
  const [testWebhook, setTestWebhook] = useState("");

  useEffect(() => {
    if (bitrixQ.data?.webhook_url !== undefined) {
      setTestWebhook(bitrixQ.data.webhook_url ?? "");
    }
  }, [bitrixQ.data?.webhook_url]);

  const rolesQ = useSettingsRolesQuery();
  const promoteMutation = useSettingsPromoteUserMutation();
  const demoteMutation = useSettingsDemoteUserMutation();
  const [searchRole, setSearchRole] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleActionMode, setRoleActionMode] = useState<"promote" | "demote">("promote");
  const [selectedUser, setSelectedUser] = useState<SettingsRoleUser | null>(null);
  const [rolePassword, setRolePassword] = useState("");
  const [roleReason, setRoleReason] = useState("");

  const filteredRoleUsers = useMemo(() => {
    const users = rolesQ.data?.users ?? [];
    if (!searchRole.trim()) return users;
    const needle = searchRole.trim().toLowerCase();
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.role.toLowerCase().includes(needle)
    );
  }, [rolesQ.data?.users, searchRole]);

  async function saveCompany() {
    try {
      await companyMutation.mutateAsync({
        company_name: companyForm.company_name.trim() || null,
        employer_id: companyForm.employer_id.trim() || null,
        trade_license_no: companyForm.trade_license_no.trim() || null,
        default_bank_agent_code: companyForm.default_bank_agent_code.trim() || null,
        wps_account_number: companyForm.wps_account_number.trim() || null,
      });
      toast.success("Company settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save company settings");
    }
  }

  async function uploadCompanyLogo() {
    if (!logoFile) {
      toast.error("Select a logo file first");
      return;
    }

    try {
      await companyLogoMutation.mutateAsync(logoFile);
      setLogoFile(null);
      setLogoInputKey((prev) => prev + 1);
      toast.success("Company logo updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload company logo");
    }
  }

  async function runBitrixTest() {
    try {
      const result = await testBitrix.mutateAsync({ webhook_url: testWebhook || undefined });
      if (result.ok) {
        toast.success(`Bitrix webhook test passed (${result.sample_users} users found)`);
      } else {
        toast.error(result.message || "Bitrix webhook test failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bitrix test failed");
    }
  }

  async function runBitrixSync() {
    try {
      const result = await syncBitrix.mutateAsync();
      if (!result.enabled) {
        toast.error("Bitrix sync is disabled in environment settings");
      } else if (!result.configured) {
        toast.error("Bitrix webhook is not configured. Set BITRIX_WEBHOOK_URL and retry.");
      } else {
        toast.success("Bitrix sync started");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to trigger Bitrix sync");
    }
  }

  function openRoleDialog(mode: "promote" | "demote", user: SettingsRoleUser) {
    setRoleActionMode(mode);
    setSelectedUser(user);
    setRolePassword("");
    setRoleReason("");
    setRoleDialogOpen(true);
  }

  async function submitRoleAction() {
    if (!selectedUser) return;
    if (!rolePassword.trim()) {
      toast.error("Current password is required");
      return;
    }

    try {
      if (roleActionMode === "promote") {
        await promoteMutation.mutateAsync({
          userId: selectedUser.id,
          body: { current_password: rolePassword, reason: roleReason || null },
        });
        toast.success("User promoted to admin");
      } else {
        await demoteMutation.mutateAsync({
          userId: selectedUser.id,
          body: { current_password: rolePassword, reason: roleReason || null },
        });
        toast.success("Admin role removed");
      }

      setRoleDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role update failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Global Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure company info, Bitrix integration, and role permissions.
          </p>
        </div>
        <Badge variant="secondary">Last refresh: {renderTimeAgo(settingsQ.dataUpdatedAt ? new Date(settingsQ.dataUpdatedAt).toISOString() : null)}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <Card className="h-fit border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <Button
                  key={section.id}
                  type="button"
                  variant={activeSection === section.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {section.label}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-h-140">
          <CardHeader>
            <CardTitle className="text-lg">
              {settingsSections.find((section) => section.id === activeSection)?.label ?? "Settings"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeSection === "company" ? (
              companyQ.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={companyForm.company_name}
                        onChange={(event) => setCompanyForm((prev) => ({ ...prev, company_name: event.target.value }))}
                        placeholder="CloserHolic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer ID</Label>
                      <Input
                        value={companyForm.employer_id}
                        onChange={(event) => setCompanyForm((prev) => ({ ...prev, employer_id: event.target.value }))}
                        placeholder="UAE-EMP-0001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Trade License No</Label>
                      <Input
                        value={companyForm.trade_license_no}
                        onChange={(event) =>
                          setCompanyForm((prev) => ({ ...prev, trade_license_no: event.target.value }))
                        }
                        placeholder="TL-CH-2026-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Bank Agent Code</Label>
                      <Input
                        value={companyForm.default_bank_agent_code}
                        onChange={(event) =>
                          setCompanyForm((prev) => ({ ...prev, default_bank_agent_code: event.target.value }))
                        }
                        placeholder="ENBDUAEAXXX"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>WPS Account Number</Label>
                      <Input
                        value={companyForm.wps_account_number}
                        onChange={(event) =>
                          setCompanyForm((prev) => ({ ...prev, wps_account_number: event.target.value }))
                        }
                        placeholder="0331234567890123"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div className="space-y-1">
                      <Label htmlFor="company-logo">Company Logo</Label>
                      <p className="text-xs text-muted-foreground">Upload a logo image (max 5MB).</p>
                    </div>

                    {companyQ.data?.company_logo_url ? (
                      <div className="space-y-2">
                        <img
                          src={companyQ.data.company_logo_url}
                          alt="Company logo"
                          className="h-16 w-auto rounded border bg-background p-1 object-contain"
                        />
                        <a
                          href={companyQ.data.company_logo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-xs text-primary underline"
                        >
                          {companyQ.data.company_logo_url}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No logo uploaded yet.</p>
                    )}

                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <Input
                        key={logoInputKey}
                        id="company-logo"
                        type="file"
                        accept="image/*"
                        onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!logoFile || companyLogoMutation.isPending}
                        onClick={uploadCompanyLogo}
                      >
                        {companyLogoMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload Logo
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      Updated: {renderTimeAgo(companyQ.data?.updated_at ?? null)}
                    </span>
                    <Button type="button" onClick={saveCompany} disabled={companyMutation.isPending}>
                      {companyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Company Settings
                    </Button>
                  </div>
                </div>
              )
            ) : null}

            {activeSection === "bitrix" ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="mb-1 font-medium">Sync Source</p>
                    <p className="text-sm text-muted-foreground">{bitrixQ.data?.source === "env" ? "Environment Variables" : "Unknown"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="mb-1 font-medium">Scheduler Status</p>
                    <p className="text-sm text-muted-foreground">
                      {bitrixQ.data?.enabled ? "Enabled" : "Disabled"} • Every {Math.round((bitrixQ.data?.sync_interval_ms ?? 0) / 60000)} min
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL (Test only)</Label>
                  <Input
                    value={testWebhook}
                    onChange={(event) => setTestWebhook(event.target.value)}
                    placeholder="https://your-bitrix-webhook"
                  />
                  <p className="text-xs text-muted-foreground">
                    Bitrix config stays env-driven in this release. Use this URL to validate webhook connectivity.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={runBitrixTest} disabled={testBitrix.isPending}>
                    {testBitrix.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Test Connection
                  </Button>
                  <Button type="button" onClick={runBitrixSync} disabled={syncBitrix.isPending}>
                    {syncBitrix.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Trigger Sync Now
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      void bitrixQ.refetch();
                      void bitrixStatusQ.refetch();
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                </div>

                <Separator />

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoMetric label="Processed" value={String(bitrixStatusQ.data?.processed ?? bitrixQ.data?.status.processed ?? 0)} />
                  <InfoMetric label="Updated" value={String(bitrixStatusQ.data?.updated ?? bitrixQ.data?.status.updated ?? 0)} />
                  <InfoMetric label="Skipped (Locked)" value={String(bitrixStatusQ.data?.skippedLocked ?? bitrixQ.data?.status.skippedLocked ?? 0)} />
                  <InfoMetric
                    label="Last Sync"
                    value={renderTimeAgo(bitrixStatusQ.data?.timestamp ?? bitrixQ.data?.status.timestamp ?? null)}
                  />
                </div>
              </div>
            ) : null}

            {activeSection === "roles" ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <InfoMetric label="Total Users" value={String(rolesQ.data?.totals.users ?? 0)} />
                  <InfoMetric label="Admins" value={String(rolesQ.data?.totals.admins ?? 0)} />
                  <InfoMetric label="Employees" value={String(rolesQ.data?.totals.employees ?? 0)} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="settings-role-search">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="settings-role-search"
                      className="pl-9"
                      placeholder="Search by name, email, or role"
                      value={searchRole}
                      onChange={(event) => setSearchRole(event.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Employment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rolesQ.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Loading roles...
                          </TableCell>
                        </TableRow>
                      ) : filteredRoleUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No users match your search.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRoleUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.is_active ? "secondary" : "destructive"}>
                                {user.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.employment_status}</TableCell>
                            <TableCell className="space-x-2 text-right">
                              {user.role === "ADMIN" ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={meQ.data?.id === user.id || demoteMutation.isPending}
                                  onClick={() => openRoleDialog("demote", user)}
                                >
                                  Demote
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={promoteMutation.isPending}
                                  onClick={() => openRoleDialog("promote", user)}
                                >
                                  Promote
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleActionMode === "promote" ? "Promote User to Admin" : "Remove Admin Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-medium">{selectedUser?.full_name}</p>
              <p className="text-muted-foreground">{selectedUser?.email}</p>
            </div>

            <div className="space-y-2">
              <Label>Current Password (confirmation)</Label>
              <Input
                type="password"
                value={rolePassword}
                onChange={(event) => setRolePassword(event.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                rows={3}
                value={roleReason}
                onChange={(event) => setRoleReason(event.target.value)}
                placeholder="Reason for this role action"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={roleActionMode === "promote" ? "default" : "destructive"}
              onClick={submitRoleAction}
              disabled={promoteMutation.isPending || demoteMutation.isPending}
            >
              {promoteMutation.isPending || demoteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {roleActionMode === "promote" ? "Promote" : "Demote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
