"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AssetCategory } from "@/lib/api/types";
import { useAssetCategoriesQuery, useCreateAssetCategoryMutation, useUpdateAssetCategoryMutation } from "@/lib/query/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type AssetCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CategoryFormState = {
  name: string;
  description: string;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: CategoryFormState = {
  name: "",
  description: "",
  is_active: true,
  sort_order: "0",
};

function toFormState(category?: AssetCategory | null): CategoryFormState {
  if (!category) return emptyForm;
  return {
    name: category.name ?? "",
    description: category.description ?? "",
    is_active: category.is_active,
    sort_order: String(category.sort_order ?? 0),
  };
}

export function AssetCategoryDialog({ open, onOpenChange }: AssetCategoryDialogProps) {
  const categoriesQuery = useAssetCategoriesQuery();
  const createMutation = useCreateAssetCategoryMutation();
  const updateMutation = useUpdateAssetCategoryMutation();

  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<CategoryFormState>(emptyForm);

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const selected = useMemo(
    () => categories.find((category) => category.id === selectedId) ?? null,
    [categories, selectedId],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setForm(emptyForm);
  }, [open]);

  useEffect(() => {
    setForm(toFormState(selected));
  }, [selected]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const setField = <K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      is_active: form.is_active,
      sort_order: Number(form.sort_order || 0),
    };

    try {
      if (selected) {
        await updateMutation.mutateAsync({
          categoryId: selected.id,
          body,
        });
        toast.success("Category updated.");
      } else {
        const created = await createMutation.mutateAsync(body);
        setSelectedId(created.id);
        toast.success("Category created.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save category.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Asset Categories</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className={`cursor-pointer ${selectedId === category.id ? "bg-muted/60" : ""}`}
                    onClick={() => setSelectedId(category.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.description ?? "No description"}</div>
                    </TableCell>
                    <TableCell>{category.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>{category.sort_order ?? 0}</TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      No categories created yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{selected ? "Edit Category" : "Create Category"}</h3>
              {selected ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId("")}>
                  New
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-category-name">Name</Label>
              <Input id="asset-category-name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-category-description">Description</Label>
              <Textarea
                id="asset-category-description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.is_active ? "ACTIVE" : "INACTIVE"}
                onValueChange={(value) => setField("is_active", value === "ACTIVE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-category-sort-order">Sort Order</Label>
              <Input
                id="asset-category-sort-order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setField("sort_order", e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : selected ? "Save Category" : "Create Category"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
