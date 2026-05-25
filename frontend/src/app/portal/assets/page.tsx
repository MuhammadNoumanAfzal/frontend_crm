"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useMyAssetsQuery } from "@/lib/query/hooks";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export default function MyAssetsPage() {
  const assets = useMyAssetsQuery();

  if (assets.isLoading) return <PageSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Assets</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Serial No</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(assets.data ?? []).map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.serial_no}</TableCell>
                <TableCell>
                  <Badge variant={asset.status === "ALLOCATED" ? "default" : "secondary"}>{asset.status}</Badge>
                </TableCell>
                <TableCell>{formatDate(asset.assigned_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
