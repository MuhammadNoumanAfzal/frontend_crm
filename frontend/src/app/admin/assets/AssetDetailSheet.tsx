"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Asset, AssetCondition, AssetStatus } from "@/lib/api/types";
import {
  useAssetAssignMutation,
  useAssetDetailQuery,
  useAssetHistoryQuery,
  useAssetLifecycleMutation,
  useAssetReturnMutation,
  useDeleteAssetDocumentMutation,
  useDeleteAssetMutation,
  useEmployeesQuery,
  useUploadAssetDocumentMutation,
  useUploadAssetImageMutation,
} from "@/lib/query/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Pencil, Trash2, Upload } from "lucide-react";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

type AssetDetailSheetProps = {
  assetId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
  onEdit?: (asset: Asset) => void;
};

export function AssetDetailSheet({ assetId, onClose, onUpdated, onEdit }: AssetDetailSheetProps) {
  const detailQuery = useAssetDetailQuery(assetId);
  const historyQuery = useAssetHistoryQuery(assetId, { page: 1, limit: 10 });
  const employeesQuery = useEmployeesQuery({ page: 1, limit: 300, is_active: true });

  const assignMutation = useAssetAssignMutation();
  const returnMutation = useAssetReturnMutation();
  const lifecycleMutation = useAssetLifecycleMutation();
  const uploadImageMutation = useUploadAssetImageMutation();
  const uploadDocumentMutation = useUploadAssetDocumentMutation();
  const deleteDocumentMutation = useDeleteAssetDocumentMutation();
  const deleteAssetMutation = useDeleteAssetMutation();

  const [employeeId, setEmployeeId] = useState("");
  const [expectedReturnAt, setExpectedReturnAt] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [condition, setCondition] = useState<AssetCondition>("GOOD");
  const [lifecycleStatus, setLifecycleStatus] = useState<AssetStatus>("RETURNED");
  const [lifecycleCondition, setLifecycleCondition] = useState<AssetCondition>("GOOD");
  const [lifecycleNotes, setLifecycleNotes] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const asset = detailQuery.data;
  const history = historyQuery.data?.items ?? [];
  const employees = useMemo(() => employeesQuery.data?.data ?? [], [employeesQuery.data]);

  const canAssign = asset?.status !== "ALLOCATED";
  const canReturn = asset?.status === "ALLOCATED";

  const refresh = () => {
    void detailQuery.refetch();
    void historyQuery.refetch();
    onUpdated?.();
  };

  const handleAssign = async () => {
    if (!asset) return;
    if (!employeeId) {
      toast.error("Select an employee before assigning the asset.");
      return;
    }

    try {
      await assignMutation.mutateAsync({
        assetId: asset.id,
        body: {
          employee_id: employeeId,
          expected_return_at: expectedReturnAt || undefined,
          handover_notes: handoverNotes || undefined,
        },
      });
      toast.success("Asset assigned successfully.");
      setEmployeeId("");
      setExpectedReturnAt("");
      setHandoverNotes("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign asset.");
    }
  };

  const handleReturn = async () => {
    if (!asset) return;

    try {
      await returnMutation.mutateAsync({
        assetId: asset.id,
        body: {
          condition,
          return_notes: returnNotes || undefined,
        },
      });
      toast.success("Asset returned successfully.");
      setReturnNotes("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return asset.");
    }
  };

  const handleLifecycle = async () => {
    if (!asset) return;

    try {
      await lifecycleMutation.mutateAsync({
        assetId: asset.id,
        body: {
          status: lifecycleStatus,
          condition: lifecycleCondition,
          notes: lifecycleNotes || undefined,
        },
      });
      toast.success("Lifecycle updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update lifecycle.");
    }
  };

  const handleImageUpload = async () => {
    if (!asset || !imageFile) {
      toast.error("Choose an image file first.");
      return;
    }

    try {
      await uploadImageMutation.mutateAsync({ assetId: asset.id, file: imageFile });
      toast.success("Asset image uploaded.");
      setImageFile(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image.");
    }
  };

  const handleDocumentUpload = async () => {
    if (!asset) return;
    if (!documentTitle.trim() || !documentType.trim() || !documentFile) {
      toast.error("Title, type, and file are required.");
      return;
    }

    try {
      await uploadDocumentMutation.mutateAsync({
        assetId: asset.id,
        title: documentTitle.trim(),
        type: documentType.trim(),
        file: documentFile,
      });
      toast.success("Asset document uploaded.");
      setDocumentTitle("");
      setDocumentType("");
      setDocumentFile(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload document.");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!asset) return;
    if (!window.confirm("Delete this document?")) return;

    try {
      await deleteDocumentMutation.mutateAsync({ assetId: asset.id, documentId });
      toast.success("Document deleted.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete document.");
    }
  };

  const handleDeleteAsset = async () => {
    if (!asset) return;
    if (!window.confirm(`Delete asset "${asset.name}"? This cannot be undone.`)) return;

    try {
      await deleteAssetMutation.mutateAsync(asset.id);
      toast.success("Asset deleted.");
      onClose();
      onUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete asset.");
    }
  };

  return (
    <Sheet
      open={Boolean(assetId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="overflow-y-auto sm:min-w-[44rem] sm:max-w-5xl">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <SheetTitle>{asset?.name ?? "Asset Detail"}</SheetTitle>
            {asset ? (
              <div className="flex gap-2 pr-8">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit?.(asset)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => void handleDeleteAsset()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        </SheetHeader>

        {detailQuery.isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : !asset ? (
          <p className="p-4 text-sm text-muted-foreground">No asset details found.</p>
        ) : (
          <div className="space-y-4 p-4">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={asset.status === "ALLOCATED" ? "default" : asset.status === "RETURNED" ? "secondary" : "destructive"}>
                        {asset.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Condition</span>
                      <span>{asset.condition ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Serial No</span>
                      <span>{asset.serial_no}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Asset Tag</span>
                      <span>{asset.asset_tag ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Category</span>
                      <span>{asset.category?.name ?? asset.category_free_text ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Holder</span>
                      <span>{asset.employee?.full_name ?? "Unassigned"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Assigned At</span>
                      <span>{formatDateTime(asset.assigned_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Returned At</span>
                      <span>{formatDateTime(asset.returned_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Purchase Date</span>
                      <span>{formatDate(asset.purchase_date)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Warranty Expiry</span>
                      <span>{formatDate(asset.warranty_expiry)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Manufacturer</span>
                      <span>{asset.manufacturer ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Model</span>
                      <span>{asset.model ?? "-"}</span>
                    </div>
                    <div className="md:col-span-2">
                      <div className="mb-1 text-muted-foreground">Notes</div>
                      <div className="rounded-lg border p-3">{asset.notes ?? "No notes recorded."}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Asset Image</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {asset.image_url ? (
                      <img src={asset.image_url} alt={asset.name} className="max-h-56 rounded-lg border object-cover" />
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No asset image uploaded yet.</div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                      <Button type="button" onClick={() => void handleImageUpload()} disabled={uploadImageMutation.isPending}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assign Asset</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Employee</Label>
                      <Select
                        value={employeeId || "UNASSIGNED"}
                        onValueChange={(value) => setEmployeeId(!value || value === "UNASSIGNED" ? "" : value)}
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
                      <Label>Expected Return Date</Label>
                      <Input type="date" value={expectedReturnAt} onChange={(e) => setExpectedReturnAt(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Handover Notes</Label>
                      <Textarea
                        value={handoverNotes}
                        onChange={(event) => setHandoverNotes(event.target.value)}
                        placeholder="Optional notes for this assignment"
                      />
                    </div>
                    <Button type="button" onClick={() => void handleAssign()} disabled={!canAssign || assignMutation.isPending || employeesQuery.isLoading}>
                      Assign
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Return Asset</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Condition on Return</Label>
                      <Select value={condition} onValueChange={(value) => setCondition((value as AssetCondition) ?? "GOOD")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Condition" />
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
                      <Label>Return Notes</Label>
                      <Textarea
                        value={returnNotes}
                        onChange={(event) => setReturnNotes(event.target.value)}
                        placeholder="Optional notes for this return"
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={() => void handleReturn()} disabled={!canReturn || returnMutation.isPending}>
                      Mark as Returned
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Lifecycle</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={lifecycleStatus} onValueChange={(value) => setLifecycleStatus((value as AssetStatus) ?? "RETURNED")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RETURNED">RETURNED</SelectItem>
                          <SelectItem value="ALLOCATED">ALLOCATED</SelectItem>
                          <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={lifecycleCondition} onValueChange={(value) => setLifecycleCondition((value as AssetCondition) ?? "GOOD")}>
                        <SelectTrigger>
                          <SelectValue />
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
                      <Label>Notes</Label>
                      <Textarea value={lifecycleNotes} onChange={(e) => setLifecycleNotes(e.target.value)} />
                    </div>
                    <Button type="button" onClick={() => void handleLifecycle()} disabled={lifecycleMutation.isPending}>
                      Update Lifecycle
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Upload Document</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input value={documentType} onChange={(e) => setDocumentType(e.target.value)} placeholder="e.g. Invoice, Warranty, Handover" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>File</Label>
                      <Input type="file" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="button" onClick={() => void handleDocumentUpload()} disabled={uploadDocumentMutation.isPending}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {asset.documents?.map((document) => (
                          <TableRow key={document.id}>
                            <TableCell>{document.title}</TableCell>
                            <TableCell>{document.type}</TableCell>
                            <TableCell>{formatDateTime(document.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => window.open(document.secure_url, "_blank", "noopener,noreferrer")}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open
                                </Button>
                                <Button type="button" variant="destructive" size="sm" onClick={() => void handleDeleteDocument(document.id)}>
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {asset.documents?.length ? null : (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                              No documents uploaded for this asset.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Assignment History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Expected Return</TableHead>
                          <TableHead>Returned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{entry.employee?.full_name ?? entry.employee_id}</TableCell>
                            <TableCell>{formatDate(entry.assigned_at)}</TableCell>
                            <TableCell>{formatDate(entry.expected_return_at)}</TableCell>
                            <TableCell>{formatDate(entry.returned_at)}</TableCell>
                          </TableRow>
                        ))}
                        {history.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <p className="p-4 text-sm text-muted-foreground">No assignment history available.</p>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
