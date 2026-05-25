"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import type { EmployeeRow } from "@/lib/api/types";
import { useCreateEmployeeMutation, useUpdateEmployeeMutation } from "@/lib/query/hooks";
import { toast } from "sonner";

const schema = z
  .object({
    full_name: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().email("Enter a valid work email address"),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    employee_code: z
      .string()
      .optional()
      .refine((value) => !value || value.trim().length >= 2, "Employee ID must be at least 2 characters"),
    date_of_birth: z.string().optional(),
    gender: z.string().optional(),
    nationality: z.string().optional(),
    personal_email: z.string().trim().email("Enter a valid personal email").optional().or(z.literal("")),
    phone: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_phone: z.string().optional(),

    department: z.string().optional(),
    designation: z.string().optional(),
    employment_type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]).default("FULL_TIME"),
    reporting_manager_id: z.string().optional(),
    joining_date: z.string().optional(),
    probation_end_date: z.string().optional(),
    contract_end_date: z.string().optional(),
    employment_status: z
      .enum(["CANDIDATE", "ONBOARDING", "ACTIVE", "TERMINATING", "TERMINATED"])
      .default("ACTIVE"),

    salary_flat: z
      .string()
      .min(1, "Base salary is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Base salary must be a valid number (e.g. 4500 or 4500.50)"),
    currency: z.string().default("AED"),
    pay_frequency: z.enum(["MONTHLY", "BIWEEKLY"]).default("MONTHLY"),
    housing_allowance: z.string().optional(),
    transport_allowance: z.string().optional(),
    other_benefits: z.string().optional(),
    bank_name: z.string().optional(),
    bank_account_no: z.string().optional(),
    bank_iban: z.string().optional(),

    passport_number: z.string().optional(),
    passport_expiry: z.string().optional(),
    visa_type: z.string().optional(),
    visa_number: z.string().optional(),
    visa_expiry: z.string().optional(),
    work_permit_number: z.string().optional(),

    bitrix_id: z.string().optional(),
    manual_bitrix_sync_lock: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.salary_flat && Number(data.salary_flat) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_flat"],
        message: "Salary must be a positive number",
      });
    }
    if (data.passport_expiry) {
      const d = new Date(data.passport_expiry);
      if (!Number.isNaN(d.getTime()) && d.getTime() < Date.now()) {
        ctx.addIssue({ code: "custom", path: ["passport_expiry"], message: "Passport expiry must be in the future" });
      }
    }
  });

type FormInput = z.input<typeof schema>;

function asDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toIso(v?: string) {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  editing,
  managers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: EmployeeRow | null;
  managers: EmployeeRow[];
  onSaved?: () => void;
}) {
  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const form = useForm<FormInput>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      employee_code: "",
      salary_flat: "",
      currency: "AED",
      pay_frequency: "MONTHLY",
      employment_type: "FULL_TIME",
      employment_status: "ACTIVE",
      housing_allowance: "0",
      transport_allowance: "0",
      other_benefits: "0",
      personal_email: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      form.reset({
        full_name: "",
        email: "",
        password: "",
        employee_code: "",
        salary_flat: "",
        currency: "AED",
        pay_frequency: "MONTHLY",
        employment_type: "FULL_TIME",
        employment_status: "ACTIVE",
        housing_allowance: "0",
        transport_allowance: "0",
        other_benefits: "0",
        personal_email: "",
      });
      return;
    }
    form.reset({
      full_name: editing.full_name,
      email: editing.email,
      employee_code: editing.employee_data?.employee_code ?? "",
      department: editing.employee_data?.department ?? "",
      designation: editing.employee_data?.designation ?? "",
      employment_type: editing.employee_data?.employment_type ?? "FULL_TIME",
      joining_date: asDateInput(editing.employee_data?.joining_date),
      employment_status: editing.employment_status ?? "ACTIVE",
      phone: editing.employee_data?.phone ?? "",
      salary_flat: "",
      currency: editing.employee_data?.currency ?? "AED",
      pay_frequency: editing.employee_data?.pay_frequency ?? "MONTHLY",
      personal_email: editing.employee_data?.personal_email ?? "",
      probation_end_date: asDateInput(editing.employee_data?.probation_end_date),
      contract_end_date: asDateInput(editing.employee_data?.contract_end_date),
      date_of_birth: asDateInput(editing.employee_data?.date_of_birth),
      gender: editing.employee_data?.gender ?? "",
      nationality: editing.employee_data?.nationality ?? "",
      emergency_contact_name: editing.employee_data?.emergency_contact_name ?? "",
      emergency_phone: editing.employee_data?.emergency_phone ?? "",
      bank_name: editing.employee_data?.bank_name ?? "",
      bank_account_no: editing.employee_data?.bank_account_no ?? "",
      bank_iban: editing.employee_data?.bank_iban ?? "",
      passport_number: editing.employee_data?.passport_number ?? "",
      passport_expiry: asDateInput(editing.employee_data?.passport_expiry),
      visa_type: editing.employee_data?.visa_type ?? "",
      visa_number: editing.employee_data?.visa_number ?? "",
      visa_expiry: asDateInput(editing.employee_data?.visa_expiry),
      work_permit_number: editing.employee_data?.work_permit_number ?? "",
    });
  }, [open, editing, form]);

  const submitting = createMutation.isPending || updateMutation.isPending;
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      form.clearErrors();
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          form.setError(field as keyof FormInput, { type: "manual", message: issue.message });
        }
      }
      toast.error("Please fix highlighted fields before saving");
      return;
    }

    const clean = parsed.data;
    const payload = {
      ...clean,
      date_of_birth: toIso(clean.date_of_birth),
      joining_date: toIso(clean.joining_date),
      probation_end_date: toIso(clean.probation_end_date),
      contract_end_date: toIso(clean.contract_end_date),
      passport_expiry: toIso(clean.passport_expiry),
      visa_expiry: toIso(clean.visa_expiry),
      personal_email: clean.personal_email || undefined,
    };
    try {
      if (editing?.id) {
        await updateMutation.mutateAsync({
          employeeId: editing.id,
          patch: {
            ...payload,
            password: undefined,
            salary_flat: clean.salary_flat || undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          ...payload,
          password: clean.password || "Employee@123",
          salary_flat: clean.salary_flat || "0",
        });
      }
      toast.success(editing ? "Employee updated" : "Employee created");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save employee");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="comp">Compensation</TabsTrigger>
              <TabsTrigger value="visa">Visa & Docs</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Full name" error={errors.full_name?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.full_name)} {...form.register("full_name")} />
              </Field>
              <Field label="Work email" error={errors.email?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.email)} type="email" {...form.register("email")} />
              </Field>
              {!editing ? (
                <Field label="Password" error={errors.password?.message as string | undefined}>
                  <Input aria-invalid={Boolean(errors.password)} type="password" {...form.register("password")} />
                </Field>
              ) : null}
              <Field label="Personal email" error={errors.personal_email?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.personal_email)} type="email" {...form.register("personal_email")} />
              </Field>
              <Field label="Date of birth" error={errors.date_of_birth?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Gender" error={errors.gender?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.gender)} {...form.register("gender")} />
              </Field>
              <Field label="Nationality" error={errors.nationality?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.nationality)} {...form.register("nationality")} />
              </Field>
              <Field label="Phone number" error={errors.phone?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.phone)} {...form.register("phone")} />
              </Field>
              <Field label="Emergency name" error={errors.emergency_contact_name?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.emergency_contact_name)} {...form.register("emergency_contact_name")} />
              </Field>
              <Field label="Emergency phone" error={errors.emergency_phone?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.emergency_phone)} {...form.register("emergency_phone")} />
              </Field>
            </TabsContent>

            <TabsContent value="employment" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Employee ID" error={errors.employee_code?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.employee_code)} {...form.register("employee_code")} />
              </Field>
              <Field label="Department" error={errors.department?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.department)} {...form.register("department")} />
              </Field>
              <Field label="Position / Job title" error={errors.designation?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.designation)} {...form.register("designation")} />
              </Field>
              <Field label="Employment type" error={errors.employment_type?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="employment_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={Boolean(errors.employment_type)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full-time</SelectItem>
                        <SelectItem value="PART_TIME">Part-time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Reporting manager" error={errors.reporting_manager_id?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="reporting_manager_id"
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                      <SelectTrigger aria-invalid={Boolean(errors.reporting_manager_id)}><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {managers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Join date" error={errors.joining_date?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="joining_date"
                  render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Probation end date" error={errors.probation_end_date?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="probation_end_date"
                  render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Contract end date" error={errors.contract_end_date?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="contract_end_date"
                  render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Status" error={errors.employment_status?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="employment_status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={Boolean(errors.employment_status)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ONBOARDING">Probation</SelectItem>
                        <SelectItem value="CANDIDATE">Candidate</SelectItem>
                        <SelectItem value="TERMINATING">Terminating</SelectItem>
                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </TabsContent>

            <TabsContent value="comp" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Base salary" error={errors.salary_flat?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.salary_flat)} {...form.register("salary_flat")} />
              </Field>
              <Field label="Currency" error={errors.currency?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.currency)} {...form.register("currency")} />
              </Field>
              <Field label="Pay frequency" error={errors.pay_frequency?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="pay_frequency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={Boolean(errors.pay_frequency)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Housing allowance" error={errors.housing_allowance?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.housing_allowance)} {...form.register("housing_allowance")} />
              </Field>
              <Field label="Transport allowance" error={errors.transport_allowance?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.transport_allowance)} {...form.register("transport_allowance")} />
              </Field>
              <Field label="Other benefits" error={errors.other_benefits?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.other_benefits)} {...form.register("other_benefits")} />
              </Field>
              <Field label="Bank name" error={errors.bank_name?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.bank_name)} {...form.register("bank_name")} />
              </Field>
              <Field label="Bank account" error={errors.bank_account_no?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.bank_account_no)} {...form.register("bank_account_no")} />
              </Field>
              <Field label="IBAN" error={errors.bank_iban?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.bank_iban)} {...form.register("bank_iban")} />
              </Field>
            </TabsContent>

            <TabsContent value="visa" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Passport number" error={errors.passport_number?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.passport_number)} {...form.register("passport_number")} />
              </Field>
              <Field label="Passport expiry" error={errors.passport_expiry?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="passport_expiry"
                  render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Visa type" error={errors.visa_type?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.visa_type)} {...form.register("visa_type")} />
              </Field>
              <Field label="Visa number" error={errors.visa_number?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.visa_number)} {...form.register("visa_number")} />
              </Field>
              <Field label="Visa expiry" error={errors.visa_expiry?.message as string | undefined}>
                <Controller
                  control={form.control}
                  name="visa_expiry"
                  render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Work permit number" error={errors.work_permit_number?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.work_permit_number)} {...form.register("work_permit_number")} />
              </Field>
            </TabsContent>

            <TabsContent value="system" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Bitrix24 ID" error={errors.bitrix_id?.message as string | undefined}>
                <Input aria-invalid={Boolean(errors.bitrix_id)} {...form.register("bitrix_id")} />
              </Field>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Employee"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className={error ? "text-destructive" : undefined}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
