"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Search, Inbox } from "lucide-react";

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
  const [searched, setSearched] = useState(false);

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
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (sku.trim()) params.set("sku", sku.trim());
      if (batchNumber.trim()) params.set("batchNumber", batchNumber.trim());
      if (warehouseId) params.set("warehouseId", warehouseId);
      if (locationId) params.set("locationId", locationId);

      const res = await fetch(`/api/inventory/search?${params.toString()}`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = (await res.json()) as SearchResultRow[];
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Inventory Search
          </h1>
          <p className="text-sm text-muted-foreground">
            Filter by SKU, batch number, warehouse and virtual location.
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">SKU</Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-COLA-001"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Batch Number</Label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="BATCH-001"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Warehouse</Label>
              <Select
                value={warehouseId}
                onValueChange={(v) => setWarehouseId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} &mdash; {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Select
                value={locationId}
                onValueChange={(v) => setLocationId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {selectedWarehouse?.locations?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.code} &mdash; {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => void runSearch()}
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            Results{" "}
            {searched && !loading ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({results.length} {results.length === 1 ? "lot" : "lots"})
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!searched ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Search className="h-10 w-10 opacity-40" />
              <div className="text-sm font-medium">
                Enter filters and click Search
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40" />
              <div className="text-sm font-medium">No matching stock found</div>
              <div className="text-xs">
                Try adjusting your filters.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    <TableRow
                      key={`${r.product.id}:${r.batch.id}:${r.location.code}`}
                    >
                      <TableCell>
                        <div className="font-medium">{r.product.sku}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.product.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {r.batch.batchNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Exp:{" "}
                          {r.batch.expiryDate
                            ? r.batch.expiryDate.slice(0, 10)
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.warehouse.code}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.location.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          ${String(r.batch.unitCost)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {r.quantityOnHand}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
