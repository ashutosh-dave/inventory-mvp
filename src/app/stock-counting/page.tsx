"use client";

import { useEffect, useMemo, useState } from "react";

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
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">Source</h2>
          <label className="mb-2 block text-sm font-medium">Warehouse</label>
          <select
            className="w-full rounded border p-2"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>

          <label className="mb-2 mt-4 block text-sm font-medium">Location</label>
          <select
            className="w-full rounded border p-2"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {selectedWarehouse?.locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} - {l.name}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">Stock Out</h2>
          <label className="mb-2 block text-sm font-medium">Product SKU</label>
          <div className="flex gap-2">
            <input
              className="w-full rounded border p-2"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. SKU-COLA-001"
            />
            <button
              className="rounded bg-primary px-3 py-2 text-primary-foreground"
              onClick={loadProduct}
              disabled={!sku.trim() || loading}
              type="button"
            >
              Load
            </button>
          </div>

          {product ? (
            <div className="mt-3 text-sm">
              <div className="font-medium">{product.name}</div>
              <div className="text-muted-foreground">
                Base unit: {product.baseUnit.code}
              </div>
            </div>
          ) : null}

          <label className="mb-2 mt-4 block text-sm font-medium">
            Quantity (base unit)
          </label>
          <input
            className="w-full rounded border p-2"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value || "0", 10))}
          />

          <label className="mb-2 mt-4 block text-sm font-medium">Reason</label>
          <input
            className="w-full rounded border p-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button
            className="mt-4 w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            onClick={submitStockOut}
            disabled={!product || loading || !warehouseId || !locationId}
            type="button"
          >
            {loading ? "Submitting..." : "Record Stock-Out"}
          </button>
        </section>
      </div>

      {message ? (
        <div className="mt-4 rounded-lg border p-3 text-sm">{message}</div>
      ) : null}
    </main>
  );
}

