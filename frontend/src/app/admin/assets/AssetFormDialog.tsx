"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Asset, AssetCategory, AssetCondition, AssetStatus } from "@/lib/api/types";
import { useCreateAssetMutation, useAssetCategoriesQuery, useAssetUpdateMutation, useEmployeesQuery } from "@/lib/query/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AssetFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Asset | null;
  onSaved?: (asset: Asset) => void;
};

type AssetFormState = {
  name: string;
  serial_no: string;
  asset_tag: string;
  categoryMode: "existing" | "custom";
  category_id: string;
  category_name: string;
  manufacturer: string;
  model: string;
  purchase_date: string;
  purchase_cost: string;
  warranty_expiry: string;
  condition: AssetCondition;
  status: AssetStatus;
  employee_id: string;
  assigned_at: string;
  notes: string;
};

const emptyState: AssetFormState = {
  name: "",
  serial_no: "",
  asset_tag: "",
  categoryMode: "existing",
  category_id: "",
  category_name: "",
  manufacturer: "",
  model: "",
  purchase_date: "",
  purchase_cost: "",
  warranty_expiry: "",
  condition: "GOOD",
  status: "RETURNED",
  employee_id: "",
  assigned_at: "",
  notes: "",
};

function asDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toIsoDate(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function getInitialState(editing?: Asset | null): AssetFormState {
  if (!editing) return emptyState;

  return {
    name: editing.name ?? "",
    serial_no: editing.serial_no ?? "",
    asset_tag: editing.asset_tag ?? "",
    categoryMode: editing.category_id ? "existing" : "custom",
    category_id: editing.category_id ?? "",
    category_name: editing.category_free_text ?? "",
    manufacturer: editing.manufacturer ?? "",
    model: editing.model ?? "",
    purchase_date: asDateInput(editing.purchase_date),
    purchase_cost: editing.purchase_cost ?? "",
    warranty_expiry: asDateInput(editing.warranty_expiry),
    condition: editing.condition ?? "GOOD",
    status: editing.status ?? "RETURNED",
    employee_id: editing.employee_id ?? "",
    assigned_at: asDateInput(editing.assigned_at),
    notes: editing.notes ?? "",
  };
}

export function AssetFormDialog({ open, onOpenChange, editing, onSaved }: AssetFormDialogProps) {
  const createMutation = useCreateAssetMutation();
  const updateMutation = useAssetUpdateMutation();
  const categoriesQuery = useAssetCategoriesQuery();
  const employeesQuery = useEmployeesQuery({ page: 1, limit: 300, is_active: true });

  const [form, setForm] = useState<AssetFormState>(emptyState);

  useEffect(() => {
    if (!open) return;
    setForm(getInitialState(editing));
  }, [open, editing]);

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const employees = useMemo(() => employeesQuery.data?.data ?? [], [employeesQuery.data]);
  const submitting = createMutation.isPending || updateMutation.isPending;
  const isEditing = Boolean(editing);

  const setField = <K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleEmployeeChange = (value: string) => {
    setForm((current) => ({
      ...current,
      employee_id: value,
      status: value ? "ALLOCATED" : current.status === "ALLOCATED" ? "RETURNED" : current.status,
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Asset name is required.");
      return;
    }
    if (!form.serial_no.trim()) {
      toast.error("Serial number is required.");
      return;
    }
    if (form.status === "ALLOCATED" && !form.employee_id) {
      toast.error("Select an employee for allocated assets.");
      return;
    }
    if (form.categoryMode === "custom" && !form.category_name.trim() && !form.category_id) {
      toast.error("Choose a category or enter a custom category name.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      serial_no: form.serial_no.trim(),
      condition: form.condition,
      status: form.status,
      notes: form.notes.trim() || undefined,
      asset_tag: form.asset_tag.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
      model: form.model.trim() || undefined,
      purchase_date: toIsoDate(form.purchase_date),
      purchase_cost: form.purchase_cost.trim() || undefined,
      warranty_expiry: toIsoDate(form.warranty_expiry),
      assigned_at: form.employee_id ? toIsoDate(form.assigned_at) : undefined,
      employee_id: form.status === "ALLOCATED" ? form.employee_id || undefined : undefined,
      category_id: form.categoryMode === "existing" ? form.category_id || undefined : undefined,
      category_name: form.categoryMode === "custom" ? form.category_name.trim() || undefined : undefined,
    };

    if (form.status !== "ALLOCATED") {
      delete payload.employee_id;
      delete payload.assigned_at;
    }

    try {
      const asset = isEditing && editing
        ? await updateMutation.mutateAsync({ assetId: editing.id, patch: payload })
        : await createMutation.mutateAsync(payload);

      toast.success(isEditing ? "Asset updated successfully." : "Asset created successfully.");
      onSaved?.(asset);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save asset.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="purchase">Purchase</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Asset Name</Label>
              <Input id="asset-name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-serial">Serial Number</Label>
              <Input id="asset-serial" value={form.serial_no} onChange={(e) => setField("serial_no", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-tag">Asset Tag</Label>
              <Input id="asset-tag" value={form.asset_tag} onChange={(e) => setField("asset_tag", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setField("status", (value as AssetStatus) ?? "RETURNED")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETURNED">Available</SelectItem>
                  <SelectItem value="ALLOCATED">Allocated</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(value) => setField("condition", (value as AssetCondition) ?? "GOOD")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">NEW</SelectItem>
                  <SelectItem value="GOOD">GOOD</SelectItem>
                  <SelectItem value="FAIR">FAIR</SelectItem>
                  <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                  <SelectItem value="BROKEN">BROKEN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category Source</Label>
              <Select
                value={form.categoryMode}
                onValueChange={(value) => setField("categoryMode", (value as "existing" | "custom") ?? "existing")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Existing category</SelectItem>
                  <SelectItem value="custom">Custom category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.categoryMode === "existing" ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id || "UNCATEGORIZED"}
                  onValueChange={(value) => setField("category_id", !value || value === "UNCATEGORIZED" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNCATEGORIZED">No category</SelectItem>
                    {categories.map((category: AssetCategory) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="asset-category-name">Custom Category</Label>
                <Input
                  id="asset-category-name"
                  value={form.category_name}
                  onChange={(e) => setField("category_name", e.target.value)}
                  placeholder="e.g. Network Equipment"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="asset-manufacturer">Manufacturer</Label>
              <Input id="asset-manufacturer" value={form.manufacturer} onChange={(e) => setField("manufacturer", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-model">Model</Label>
              <Input id="asset-model" value={form.model} onChange={(e) => setField("model", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="asset-notes">Notes</Label>
              <Textarea id="asset-notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4} />
            </div>
          </TabsContent>

          <TabsContent value="assignment" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Assigned Employee</Label>
              <Select
                value={form.employee_id || "UNASSIGNED"}
                onValueChange={(value) => handleEmployeeChange(!value || value === "UNASSIGNED" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-assigned-at">Assigned Date</Label>
              <Input id="asset-assigned-at" type="date" value={form.assigned_at} onChange={(e) => setField("assigned_at", e.target.value)} />
            </div>
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground md:col-span-2">
              When an employee is selected, the asset will be saved as `ALLOCATED`. Leave it unassigned to keep the asset available.
            </div>
          </TabsContent>

          <TabsContent value="purchase" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset-purchase-date">Purchase Date</Label>
              <Input id="asset-purchase-date" type="date" value={form.purchase_date} onChange={(e) => setField("purchase_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-purchase-cost">Purchase Cost</Label>
              <Input
                id="asset-purchase-cost"
                value={form.purchase_cost}
                onChange={(e) => setField("purchase_cost", e.target.value)}
                placeholder="e.g. 4200.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-warranty-expiry">Warranty Expiry</Label>
              <Input id="asset-warranty-expiry" type="date" value={form.warranty_expiry} onChange={(e) => setField("warranty_expiry", e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Saving..." : isEditing ? "Save Changes" : "Create Asset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
