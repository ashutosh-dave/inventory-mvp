"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  locations: Array<{ id: string; code: string; name: string; type: string }>;
};

type SearchResultRow = {
  product: { id: string; sku: string; name: string };
  batch: {
    id: string;
    batchNumber: string;
    expiryDate: string | null;
    unitCost: string | number;
    receivedAt: string;
  };
  warehouse: { code: string; name: string };
  location: { code: string; name: string; type: string };
  quantityOnHand: number;
};

export default function InventorySearchPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");

  const [sku, setSku] = useState("");
  const [batchNumber, setBatchNumber] = useState("");

  const [results, setResults] = useState<SearchResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) return;
      const data = (await res.json()) as Warehouse[];
      setWarehouses(data);
      if (data[0]?.id) {
        setWarehouseId(data[0].id);
        const firstLoc = data[0].locations?.[0];
        if (firstLoc?.id) setLocationId(firstLoc.id);
      }
    })();
  }, []);

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId),
    [warehouses, warehouseId],
  );

  useEffect(() => {
    const firstLoc = selectedWarehouse?.locations?.[0];
    if (selectedWarehouse && firstLoc && !locationId) {
      setLocationId(firstLoc.id);
    }
  }, [selectedWarehouse, locationId]);

  async function runSearch() {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (sku.trim()) params.set("sku", sku.trim());
      if (batchNumber.trim()) params.set("batchNumber", batchNumber.trim());
      if (warehouseId) params.set("warehouseId", warehouseId);
      if (locationId) params.set("locationId", locationId);

      const res = await fetch(`/api/inventory/search?${params.toString()}`);
      if (!res.ok) {
        setMessage("Search failed.");
        return;
      }
      const data = (await res.json()) as SearchResultRow[];
      setResults(data);
      if (data.length === 0) setMessage("No matching stock found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Inventory Search</h1>
        <Link href="/stock-counting" className="text-sm text-muted-foreground hover:underline">
          Stock Out UI
        </Link>
      </div>

      <p className="mb-6 text-muted-foreground">
        High-performance filtering by SKU, batch and virtual location.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. SKU-COLA-001"
            />
          </div>

          <div className="space-y-2">
            <Label>Batch Number</Label>
            <Input
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. BATCH-001"
            />
          </div>

          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={(v) => setLocationId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {selectedWarehouse?.locations?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.code} - {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Button className="w-full" onClick={() => void runSearch()} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Results</CardTitle>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="mb-4 rounded-lg border p-3 text-sm">{message}</div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={`${r.product.id}:${r.batch.id}:${r.location.code}`}>
                  <TableCell>
                    <div className="font-medium">{r.product.sku}</div>
                    <div className="text-xs text-muted-foreground">{r.product.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.batch.batchNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      Exp: {r.batch.expiryDate ? r.batch.expiryDate.slice(0, 10) : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.warehouse.code}</div>
                    <div className="text-xs text-muted-foreground">{r.location.code}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {String(r.batch.unitCost)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {r.quantityOnHand}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

