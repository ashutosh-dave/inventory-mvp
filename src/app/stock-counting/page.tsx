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
import { Textarea } from "@/components/ui/textarea";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  locations: Array<{ id: string; code: string; name: string; type: string }>;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  baseUnit: { id: string; code: string; name: string };
};

export default function StockCountingPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");

  const [sku, setSku] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("Stock out");
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
    if (selectedWarehouse && firstLoc && locationId !== firstLoc.id) {
      setLocationId(firstLoc.id);
    }
  }, [selectedWarehouse, locationId]);

  async function loadProduct() {
    setMessage(null);
    setProduct(null);
    const res = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`);
    if (!res.ok) {
      setMessage("Product not found.");
      return;
    }
    const data = (await res.json()) as Product[];
    if (!data[0]) {
      setMessage("Product not found.");
      return;
    }
    setProduct(data[0]);
    setQuantity(1);
  }

  async function submitStockOut() {
    if (!product) {
      setMessage("Load a product first.");
      return;
    }
    if (!warehouseId || !locationId) {
      setMessage("Select warehouse + location.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          movementType: "STOCK_OUT",
          sourceType: "SALE",
          productId: product.id,
          warehouseId,
          locationId,
          unitId: product.baseUnit.id,
          quantity: Number(quantity),
          reasonNote: note,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err?.error ?? "Stock-out failed.");
        return;
      }
      setMessage("Stock-out recorded.");
      setQuantity(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <h1 className="mb-2 text-2xl font-semibold">Stock Counting</h1>
      <p className="mb-6 text-muted-foreground">
        Mobile-first interface for warehouse staff.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock Out</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product SKU</Label>
              <div className="flex gap-2">
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKU-COLA-001"
                />
                <Button
                  onClick={() => void loadProduct()}
                  disabled={!sku.trim() || loading}
                  type="button"
                >
                  Load
                </Button>
              </div>
            </div>

            {product ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{product.name}</div>
                <div className="text-muted-foreground">
                  Base unit: {product.baseUnit.code}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Quantity (base unit)</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(parseInt(e.target.value || "0", 10))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <Button
              className="w-full"
              onClick={() => void submitStockOut()}
              disabled={!product || loading || !warehouseId || !locationId}
              type="button"
            >
              {loading ? "Submitting..." : "Record Stock-Out"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {message ? (
        <div className="mt-4 rounded-lg border p-3 text-sm">{message}</div>
      ) : null}
    </main>
  );
}

