"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Asset, AssetCategory, AssetStatus } from "@/lib/api/types";
import { useAdminAssetsQuery, useAssetCategoriesQuery, useAssetExportMutation, useAssetMetricsQuery } from "@/lib/query/hooks";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FolderCog,
  Image as ImageIcon,
  Laptop,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  UserCheck,
} from "lucide-react";
import { AssetDetailSheet } from "./AssetDetailSheet";
import { AssetFormDialog } from "./AssetFormDialog";
import { AssetCategoryDialog } from "./AssetCategoryDialog";

export function AssetView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const metrics = useAssetMetricsQuery().data;
  const categories = useAssetCategoriesQuery().data ?? [];
  const exportAssets = useAssetExportMutation();

  const { data: assetsData, isLoading, refetch } = useAdminAssetsQuery({
    limit: 100,
    search: search.trim().length > 1 ? search.trim() : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    category_id: categoryFilter !== "ALL" ? categoryFilter : undefined,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const assets = useMemo(() => assetsData?.items ?? [], [assetsData?.items]);

  const handleExport = async (format: "csv" | "json") => {
    try {
      await exportAssets.mutateAsync({
        format,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        category_id: categoryFilter !== "ALL" ? categoryFilter : undefined,
        search: search.trim() || undefined,
      });
      toast.success(`Assets exported as ${format.toUpperCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export assets.");
    }
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setCreateOpen(true);
  };

  const closeForm = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setEditingAsset(null);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets & Inventory</h1>
          <p className="text-muted-foreground">Manage physical assets, ownership history, documents, and lifecycle states.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setCategoryOpen(true)}>
            <FolderCog className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport("csv")}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("json")}>Export JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard title="Total Assets" value={metrics?.total_assets ?? 0} icon={Laptop} />
        <StatCard title="Assigned" value={metrics?.allocated_assets ?? 0} icon={UserCheck} tone="warning" />
        <StatCard title="Available" value={metrics?.returned_assets ?? 0} icon={Settings2} tone="success" />
        <StatCard title="Damaged" value={metrics?.damaged_assets ?? 0} icon={Settings2} tone="danger" />
        <StatCard title="Due Returns" value={metrics?.due_returns ?? 0} icon={FolderCog} />
      </div>

      <Card className="flex flex-1 flex-col shadow-sm">
        <div className="flex flex-col gap-4 border-b bg-muted/20 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md space-y-1">
            <Label htmlFor="asset-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="asset-search"
                placeholder="Search by name, tag, serial, holder, or category..."
                className="bg-background pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:grid-cols-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as AssetStatus | "ALL") ?? "ALL")}>
                <SelectTrigger className="bg-background sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="RETURNED">Available</SelectItem>
                  <SelectItem value="ALLOCATED">Allocated</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "ALL")}>
                <SelectTrigger className="bg-background sm:w-52">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {categories.map((category: AssetCategory) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <CardContent className="max-h-[38rem] overflow-auto p-0">
          {isLoading ? (
            <div className="p-8">
              <PageSkeleton />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50">
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Counts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-muted/40">
                    <TableCell>
                      {asset.image_url ? (
                        <img src={asset.image_url} alt={asset.name} className="h-8 w-8 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.asset_tag || asset.serial_no}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.category?.name || asset.category_free_text || "Uncategorized"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          asset.status === "ALLOCATED"
                            ? "default"
                            : asset.status === "RETURNED"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {asset.status === "RETURNED" ? "Available" : asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{asset.condition ?? "-"}</span>
                    </TableCell>
                    <TableCell>
                      {asset.employee ? (
                        <div>
                          <div className="font-medium text-sm">{asset.employee.full_name}</div>
                          <div className="text-xs text-muted-foreground">{asset.employee.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{asset._count?.assignments ?? 0} assignments</div>
                        <div className="text-muted-foreground">{asset._count?.documents ?? 0} docs</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedAssetId(asset.id)}>
                          View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedAssetId(asset.id)}>Open detail</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(asset)}>Edit asset</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No assets found matching the current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssetFormDialog
        open={createOpen}
        onOpenChange={closeForm}
        editing={editingAsset}
        onSaved={() => {
          void refetch();
        }}
      />

      <AssetCategoryDialog open={categoryOpen} onOpenChange={setCategoryOpen} />

      <AssetDetailSheet
        assetId={selectedAssetId}
        onClose={() => setSelectedAssetId(null)}
        onUpdated={() => {
          void refetch();
        }}
        onEdit={(asset) => {
          setSelectedAssetId(null);
          openEdit(asset);
        }}
      />
    </div>
  );
}
