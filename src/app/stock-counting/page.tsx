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
import { Badge } from "@/components/ui/badge";
import { PackageMinus, CheckCircle2, XCircle } from "lucide-react";

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
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
      setMessage({ type: "error", text: "Product not found." });
      return;
    }
    const data = (await res.json()) as Product[];
    if (!data[0]) {
      setMessage({ type: "error", text: "Product not found." });
      return;
    }
    setProduct(data[0]);
    setQuantity(1);
  }

  async function submitStockOut() {
    if (!product) {
      setMessage({ type: "error", text: "Load a product first." });
      return;
    }
    if (!warehouseId || !locationId) {
      setMessage({ type: "error", text: "Select warehouse + location." });
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
        setMessage({ type: "error", text: err?.error ?? "Stock-out failed." });
        return;
      }
      setMessage({ type: "success", text: "Stock-out recorded successfully." });
      setQuantity(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PackageMinus className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Stock Counting
          </h1>
          <p className="text-sm text-muted-foreground">
            Record stock-out movements from warehouse locations.
          </p>
        </div>
      </div>

      {message ? (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select
                value={warehouseId}
                onValueChange={(v) => setWarehouseId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
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

            <div className="space-y-2">
              <Label>Virtual Location</Label>
              <Select
                value={locationId}
                onValueChange={(v) => setLocationId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {selectedWarehouse?.locations?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.code} &mdash; {l.name}
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {l.type}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Product & Quantity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product SKU</Label>
              <div className="flex gap-2">
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKU-COLA-001"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void loadProduct();
                    }
                  }}
                />
                <Button
                  onClick={() => void loadProduct()}
                  disabled={!sku.trim() || loading}
                  type="button"
                  variant="secondary"
                >
                  Load
                </Button>
              </div>
            </div>

            {product ? (
              <div className="flex items-center gap-3 rounded-lg border bg-accent/50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  {product.sku.slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {product.sku} &middot; Base unit: {product.baseUnit.code}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
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
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-10 resize-none"
                  rows={1}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => void submitStockOut()}
              disabled={!product || loading || !warehouseId || !locationId}
              type="button"
            >
              {loading ? "Recording..." : "Record Stock-Out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
