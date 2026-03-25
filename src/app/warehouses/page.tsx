"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Warehouse, ChevronDown, ChevronRight, Plus } from "lucide-react";

const LOCATION_TYPES = [
  "MAIN_STORE",
  "DAMAGED_GOODS",
  "ON_TRANSIT",
  "RECEIVING",
  "PICKING",
  "QUARANTINE",
] as const;

type LocationRow = {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
};

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  locations: LocationRow[];
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false);
  const [addWhCode, setAddWhCode] = useState("");
  const [addWhName, setAddWhName] = useState("");
  const [addWhActive, setAddWhActive] = useState(true);
  const [addWhSaving, setAddWhSaving] = useState(false);

  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseRow | null>(
    null,
  );
  const [editWhCode, setEditWhCode] = useState("");
  const [editWhName, setEditWhName] = useState("");
  const [editWhActive, setEditWhActive] = useState(true);
  const [editWhSaving, setEditWhSaving] = useState(false);

  const [locationWarehouse, setLocationWarehouse] = useState<WarehouseRow | null>(
    null,
  );
  const [locCode, setLocCode] = useState("");
  const [locName, setLocName] = useState("");
  const [locType, setLocType] = useState<(typeof LOCATION_TYPES)[number]>(
    "MAIN_STORE",
  );
  const [locActive, setLocActive] = useState(true);
  const [locSaving, setLocSaving] = useState(false);

  const loadWarehouses = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setFeedback(null);
    }
    try {
      const res = await fetch("/api/warehouses");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text:
            typeof body?.error === "string"
              ? body.error
              : "Failed to load warehouses.",
        });
        return;
      }
      setWarehouses(body as WarehouseRow[]);
    } catch {
      setFeedback({ type: "error", text: "Failed to load warehouses." });
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    if (addWarehouseOpen) {
      setAddWhCode("");
      setAddWhName("");
      setAddWhActive(true);
    }
  }, [addWarehouseOpen]);

  useEffect(() => {
    if (editingWarehouse) {
      setEditWhCode(editingWarehouse.code);
      setEditWhName(editingWarehouse.name);
      setEditWhActive(editingWarehouse.isActive);
    }
  }, [editingWarehouse]);

  useEffect(() => {
    if (locationWarehouse) {
      setLocCode("");
      setLocName("");
      setLocType("MAIN_STORE");
      setLocActive(true);
    }
  }, [locationWarehouse]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitAddWarehouse(e: React.FormEvent) {
    e.preventDefault();
    setAddWhSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addWhCode.trim(),
          name: addWhName.trim(),
          isActive: addWhActive,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text:
            typeof body?.error === "string" ? body.error : "Could not create warehouse.",
        });
        return;
      }
      setFeedback({ type: "success", text: "Warehouse created." });
      setAddWarehouseOpen(false);
      await loadWarehouses({ silent: true });
    } finally {
      setAddWhSaving(false);
    }
  }

  async function submitEditWarehouse(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWarehouse) return;
    setEditWhSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/warehouses/${editingWarehouse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editWhCode.trim(),
          name: editWhName.trim(),
          isActive: editWhActive,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text:
            typeof body?.error === "string" ? body.error : "Could not update warehouse.",
        });
        return;
      }
      setFeedback({ type: "success", text: "Warehouse updated." });
      setEditingWarehouse(null);
      await loadWarehouses({ silent: true });
    } finally {
      setEditWhSaving(false);
    }
  }

  async function deleteWarehouse(w: WarehouseRow) {
    const ok = window.confirm(
      `Delete warehouse "${w.name}" (${w.code})? This may fail if it still has dependent records.`,
    );
    if (!ok) return;
    setFeedback(null);
    const res = await fetch(`/api/warehouses/${w.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFeedback({
        type: "error",
        text:
          typeof body?.error === "string" ? body.error : "Could not delete warehouse.",
      });
      return;
    }
    setFeedback({ type: "success", text: "Warehouse deleted." });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(w.id);
      return next;
    });
    await loadWarehouses({ silent: true });
  }

  async function submitAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!locationWarehouse) return;
    setLocSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: locationWarehouse.id,
          code: locCode.trim(),
          name: locName.trim(),
          type: locType,
          isActive: locActive,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text:
            typeof body?.error === "string" ? body.error : "Could not create location.",
        });
        return;
      }
      setFeedback({ type: "success", text: "Location created." });
      setLocationWarehouse(null);
      await loadWarehouses({ silent: true });
    } finally {
      setLocSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Warehouses</h1>
            <p className="text-sm text-muted-foreground">
              Manage warehouses and virtual locations.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingWarehouse(null);
            setAddWarehouseOpen(true);
          }}
        >
          Add Warehouse
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All warehouses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback ? (
            <div
              role="alert"
              className={
                feedback.type === "error"
                  ? "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  : "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
              }
            >
              {feedback.text}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading warehouses…</p>
          ) : warehouses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No warehouses yet. Create one with &quot;Add Warehouse&quot;.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Locations</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((w) => {
                  const expanded = expandedIds.has(w.id);
                  const locs = w.locations ?? [];
                  return (
                    <Fragment key={w.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleExpanded(w.id)}
                      >
                        <TableCell className="w-10 align-middle">
                          {expanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{w.code}</TableCell>
                        <TableCell>{w.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {locs.length}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Badge variant={w.isActive ? "default" : "secondary"}>
                            {w.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAddWarehouseOpen(false);
                                setEditingWarehouse(w);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => void deleteWarehouse(w)}
                            >
                              Delete
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setLocationWarehouse(w);
                                setExpandedIds((prev) => {
                                  if (prev.has(w.id)) return prev;
                                  const next = new Set(prev);
                                  next.add(w.id);
                                  return next;
                                });
                              }}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add Location
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded ? (
                        <TableRow className="border-b bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={6} className="p-0 sm:p-0">
                            <div className="border-t px-4 py-3">
                              {locs.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No locations. Use &quot;Add Location&quot; to create one.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-md border bg-background">
                                  <table className="w-full caption-bottom text-sm">
                                    <thead className="border-b [&_tr]:border-b">
                                      <tr className="border-b transition-colors hover:bg-muted/50">
                                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                                          Code
                                        </th>
                                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                                          Name
                                        </th>
                                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                                          Type
                                        </th>
                                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                                          Active
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                      {locs.map((loc) => (
                                        <tr
                                          key={loc.id}
                                          className="border-b transition-colors hover:bg-muted/40"
                                        >
                                          <td className="p-3 align-middle font-medium">
                                            {loc.code}
                                          </td>
                                          <td className="p-3 align-middle">
                                            {loc.name}
                                          </td>
                                          <td className="p-3 align-middle text-muted-foreground">
                                            {loc.type}
                                          </td>
                                          <td className="p-3 align-middle">
                                            <Badge
                                              variant={
                                                loc.isActive ? "default" : "secondary"
                                              }
                                            >
                                              {loc.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addWarehouseOpen} onOpenChange={setAddWarehouseOpen}>
        <DialogContent>
          <form onSubmit={submitAddWarehouse}>
            <DialogHeader>
              <DialogTitle>Add warehouse</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="add-wh-code">Code</Label>
                <Input
                  id="add-wh-code"
                  value={addWhCode}
                  onChange={(e) => setAddWhCode(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-wh-name">Name</Label>
                <Input
                  id="add-wh-name"
                  value={addWhName}
                  onChange={(e) => setAddWhName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="add-wh-active"
                  type="checkbox"
                  checked={addWhActive}
                  onChange={(e) => setAddWhActive(e.target.checked)}
                  className="h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="add-wh-active" className="font-normal">
                  Active
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddWarehouseOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addWhSaving}>
                {addWhSaving ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingWarehouse !== null}
        onOpenChange={(open) => {
          if (!open) setEditingWarehouse(null);
        }}
      >
        <DialogContent>
          <form onSubmit={submitEditWarehouse}>
            <DialogHeader>
              <DialogTitle>Edit warehouse</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-wh-code">Code</Label>
                <Input
                  id="edit-wh-code"
                  value={editWhCode}
                  onChange={(e) => setEditWhCode(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-wh-name">Name</Label>
                <Input
                  id="edit-wh-name"
                  value={editWhName}
                  onChange={(e) => setEditWhName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-wh-active"
                  type="checkbox"
                  checked={editWhActive}
                  onChange={(e) => setEditWhActive(e.target.checked)}
                  className="h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="edit-wh-active" className="font-normal">
                  Active
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingWarehouse(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editWhSaving}>
                {editWhSaving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={locationWarehouse !== null}
        onOpenChange={(open) => {
          if (!open) setLocationWarehouse(null);
        }}
      >
        <DialogContent>
          <form onSubmit={submitAddLocation}>
            <DialogHeader>
              <DialogTitle>
                Add location
                {locationWarehouse ? (
                  <span className="block text-sm font-normal text-muted-foreground">
                    Warehouse: {locationWarehouse.name} ({locationWarehouse.code})
                  </span>
                ) : null}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="loc-code">Code</Label>
                <Input
                  id="loc-code"
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="loc-name">Name</Label>
                <Input
                  id="loc-name"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={locType}
                  onValueChange={(v) =>
                    setLocType(v as (typeof LOCATION_TYPES)[number])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="loc-active"
                  type="checkbox"
                  checked={locActive}
                  onChange={(e) => setLocActive(e.target.checked)}
                  className="h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="loc-active" className="font-normal">
                  Active
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocationWarehouse(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={locSaving}>
                {locSaving ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
