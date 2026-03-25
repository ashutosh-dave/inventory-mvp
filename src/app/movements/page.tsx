"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowRightLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Product = {
  id: string;
  sku: string;
  name: string;
  baseUnit: { id: string; code: string; name: string };
};

type Location = { id: string; code: string; name: string; type: string };

type Warehouse = {
  id: string;
  code: string;
  name: string;
  locations: Location[];
};

type MovementEntry = {
  quantityChange: number;
  openingQty: number;
  closingQty: number;
  product: { sku: string; name: string };
  batch: { batchNumber: string } | null;
  warehouse: { code: string };
  location: { code: string };
};

type Movement = {
  id: string;
  type: string;
  sourceType: string;
  reasonCode: string | null;
  reasonNote: string | null;
  createdAt: string;
  performedBy: { name: string; email: string };
  entries: MovementEntry[];
};

type TabValue = "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "ADJUSTMENT";

const TABS: { value: TabValue; label: string }[] = [
  { value: "STOCK_IN", label: "Stock In" },
  { value: "STOCK_OUT", label: "Stock Out" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const REASON_CODES = [
  "DAMAGED",
  "EXPIRED",
  "LOST",
  "FOUND",
  "RECOUNT",
  "CORRECTION",
  "OTHER",
] as const;

const TYPE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  STOCK_IN: "default",
  STOCK_OUT: "destructive",
  TRANSFER: "secondary",
  ADJUSTMENT: "outline",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (body && typeof body === "object") {
    if (typeof body.error === "string") return body.error;
    if (typeof body.message === "string") return body.message;
  }
  return `Request failed (${res.status})`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MovementsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("STOCK_IN");

  // Warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Product lookup
  const [skuInput, setSkuInput] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");

  // Form fields — shared
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Transfer extra
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [toLocationId, setToLocationId] = useState("");

  // Adjustment extra
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNote, setReasonNote] = useState("");

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Recent movements
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await fetch("/api/warehouses");
      if (res.ok) setWarehouses(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setMovementsLoading(true);
    try {
      const res = await fetch("/api/inventory/movements?take=20");
      if (res.ok) {
        const json = await res.json();
        setMovements(json.data ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWarehouses();
    void loadMovements();
  }, [loadWarehouses, loadMovements]);

  // ---------------------------------------------------------------------------
  // Derived locations
  // ---------------------------------------------------------------------------

  const locationsForWarehouse = (whId: string) =>
    warehouses.find((w) => w.id === whId)?.locations ?? [];

  // ---------------------------------------------------------------------------
  // Product lookup
  // ---------------------------------------------------------------------------

  async function lookupProduct() {
    const sku = skuInput.trim();
    if (!sku) return;
    setProductLoading(true);
    setProductError("");
    setProduct(null);
    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`);
      if (!res.ok) {
        setProductError(await parseError(res));
        return;
      }
      const data = (await res.json()) as Product[];
      if (data.length === 0) {
        setProductError("No product found with that SKU.");
        return;
      }
      setProduct(data[0]);
    } catch {
      setProductError("Failed to look up product.");
    } finally {
      setProductLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Reset form
  // ---------------------------------------------------------------------------

  function resetForm() {
    setSkuInput("");
    setProduct(null);
    setProductError("");
    setWarehouseId("");
    setLocationId("");
    setQuantity("");
    setUnitCost("");
    setBatchNumber("");
    setExpiryDate("");
    setFromWarehouseId("");
    setFromLocationId("");
    setToWarehouseId("");
    setToLocationId("");
    setReasonCode("");
    setReasonNote("");
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) {
      setMessage({ type: "error", text: "Please load a product first." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    let body: Record<string, unknown> = {
      idempotencyKey: crypto.randomUUID(),
      productId: product.id,
      unitId: product.baseUnit.id,
    };

    switch (activeTab) {
      case "STOCK_IN":
        body = {
          ...body,
          movementType: "STOCK_IN",
          sourceType: "PURCHASE",
          warehouseId,
          locationId,
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
          quantity: Number(quantity),
          unitCost: Number(unitCost),
        };
        break;
      case "STOCK_OUT":
        body = {
          ...body,
          movementType: "STOCK_OUT",
          sourceType: "SALE",
          warehouseId,
          locationId,
          quantity: Number(quantity),
        };
        break;
      case "TRANSFER":
        body = {
          ...body,
          movementType: "TRANSFER",
          sourceType: "TRANSFER",
          fromWarehouseId,
          fromLocationId,
          toWarehouseId,
          toLocationId,
          quantity: Number(quantity),
        };
        break;
      case "ADJUSTMENT":
        body = {
          ...body,
          movementType: "ADJUSTMENT",
          sourceType: "ADJUSTMENT",
          warehouseId,
          locationId,
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
          quantity: Number(quantity),
          unitCost: unitCost ? Number(unitCost) : undefined,
          reasonCode,
          reasonNote,
        };
        break;
    }

    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMessage({ type: "error", text: await parseError(res) });
        return;
      }
      setMessage({ type: "success", text: "Movement recorded successfully." });
      resetForm();
      void loadMovements();
    } catch {
      setMessage({ type: "error", text: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Shared field renderers
  // ---------------------------------------------------------------------------

  function renderWarehouseSelect(
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    onLocationReset: () => void,
  ) {
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Select
          value={value}
          onValueChange={(v) => {
            onChange(v);
            onLocationReset();
          }}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.code} — {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function renderLocationSelect(
    id: string,
    label: string,
    whId: string,
    value: string,
    onChange: (v: string) => void,
  ) {
    const locs = locationsForWarehouse(whId);
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Select value={value} onValueChange={onChange} disabled={!whId}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={whId ? "Select location" : "Select warehouse first"} />
          </SelectTrigger>
          <SelectContent>
            {locs.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.code} — {l.name} ({l.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function renderProductLookup() {
    return (
      <div className="grid gap-2">
        <Label>Product (SKU)</Label>
        <div className="flex gap-2">
          <Input
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            placeholder="Enter SKU"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void lookupProduct();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void lookupProduct()}
            disabled={productLoading || !skuInput.trim()}
          >
            {productLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
          </Button>
        </div>
        {productError && <p className="text-sm text-destructive">{productError}</p>}
        {product && (
          <p className="text-sm text-muted-foreground">
            Loaded: <span className="font-medium text-foreground">{product.name}</span>{" "}
            (Unit: {product.baseUnit.code})
          </p>
        )}
      </div>
    );
  }

  function renderUnitField() {
    return (
      <div className="grid gap-2">
        <Label>Base Unit</Label>
        <Input value={product?.baseUnit.code ?? ""} disabled />
      </div>
    );
  }

  function renderQuantityField(label = "Quantity") {
    return (
      <div className="grid gap-2">
        <Label htmlFor="qty">{label}</Label>
        <Input
          id="qty"
          type="number"
          min={0}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab forms
  // ---------------------------------------------------------------------------

  function renderStockInForm() {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {renderWarehouseSelect("wh", "Warehouse", warehouseId, setWarehouseId, () =>
          setLocationId(""),
        )}
        {renderLocationSelect("loc", "Location", warehouseId, locationId, setLocationId)}
        {renderProductLookup()}
        <div className="grid gap-2">
          <Label htmlFor="batch">Batch Number</Label>
          <Input
            id="batch"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expiry">Expiry Date (optional)</Label>
          <Input
            id="expiry"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>
        {renderUnitField()}
        {renderQuantityField()}
        <div className="grid gap-2">
          <Label htmlFor="cost">Unit Cost</Label>
          <Input
            id="cost"
            type="number"
            min={0}
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            required
          />
        </div>
      </div>
    );
  }

  function renderStockOutForm() {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {renderWarehouseSelect("wh", "Warehouse", warehouseId, setWarehouseId, () =>
          setLocationId(""),
        )}
        {renderLocationSelect("loc", "Location", warehouseId, locationId, setLocationId)}
        {renderProductLookup()}
        {renderUnitField()}
        {renderQuantityField()}
      </div>
    );
  }

  function renderTransferForm() {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {renderWarehouseSelect("from-wh", "From Warehouse", fromWarehouseId, setFromWarehouseId, () =>
          setFromLocationId(""),
        )}
        {renderLocationSelect("from-loc", "From Location", fromWarehouseId, fromLocationId, setFromLocationId)}
        {renderWarehouseSelect("to-wh", "To Warehouse", toWarehouseId, setToWarehouseId, () =>
          setToLocationId(""),
        )}
        {renderLocationSelect("to-loc", "To Location", toWarehouseId, toLocationId, setToLocationId)}
        {renderProductLookup()}
        {renderUnitField()}
        {renderQuantityField()}
      </div>
    );
  }

  function renderAdjustmentForm() {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {renderWarehouseSelect("wh", "Warehouse", warehouseId, setWarehouseId, () =>
          setLocationId(""),
        )}
        {renderLocationSelect("loc", "Location", warehouseId, locationId, setLocationId)}
        {renderProductLookup()}
        <div className="grid gap-2">
          <Label htmlFor="adj-batch">Batch Number</Label>
          <Input
            id="adj-batch"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="adj-expiry">Expiry Date (optional)</Label>
          <Input
            id="adj-expiry"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>
        {renderUnitField()}
        {renderQuantityField("Quantity (new count)")}
        <div className="grid gap-2">
          <Label htmlFor="adj-cost">Unit Cost (optional)</Label>
          <Input
            id="adj-cost"
            type="number"
            min={0}
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reason-code">Reason Code</Label>
          <Select value={reasonCode} onValueChange={setReasonCode}>
            <SelectTrigger id="reason-code">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {REASON_CODES.map((rc) => (
                <SelectItem key={rc} value={rc}>
                  {rc.charAt(0) + rc.slice(1).toLowerCase().replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 grid gap-2">
          <Label htmlFor="reason-note">Reason Note</Label>
          <Textarea
            id="reason-note"
            value={reasonNote}
            onChange={(e) => setReasonNote(e.target.value)}
            placeholder="Explain the adjustment…"
            rows={3}
            required
          />
        </div>
      </div>
    );
  }

  const formsByTab: Record<TabValue, () => React.JSX.Element> = {
    STOCK_IN: renderStockInForm,
    STOCK_OUT: renderStockOutForm,
    TRANSFER: renderTransferForm,
    ADJUSTMENT: renderAdjustmentForm,
  };

  const tabTitles: Record<TabValue, string> = {
    STOCK_IN: "Record Stock In",
    STOCK_OUT: "Record Stock Out",
    TRANSFER: "Record Transfer",
    ADJUSTMENT: "Record Adjustment",
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ArrowRightLeft className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventory Movements</h1>
          <p className="text-sm text-muted-foreground">
            Record stock-in, stock-out, transfers, and adjustments.
          </p>
        </div>
      </div>

      {/* Status banner */}
      {message && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setMessage(null);
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">{tabTitles[activeTab]}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)}>
            {formsByTab[activeTab]()}

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={submitting || !product}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit Movement"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent movements table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Movements</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadMovements()}
            disabled={movementsLoading}
          >
            {movementsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {movementsLoading && movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin opacity-60" />
              Loading movements…
            </div>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No movements recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Qty Change</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) =>
                    m.entries.map((entry, idx) => (
                      <TableRow key={`${m.id}-${idx}`}>
                        {idx === 0 ? (
                          <TableCell rowSpan={m.entries.length} className="whitespace-nowrap align-top">
                            {fmtDate(m.createdAt)}
                          </TableCell>
                        ) : null}
                        {idx === 0 ? (
                          <TableCell rowSpan={m.entries.length} className="align-top">
                            <Badge variant={TYPE_VARIANT[m.type] ?? "outline"}>
                              {m.type.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <span className="font-medium">{entry.product.sku}</span>{" "}
                          <span className="text-muted-foreground">{entry.product.name}</span>
                        </TableCell>
                        <TableCell>{entry.batch?.batchNumber ?? "—"}</TableCell>
                        <TableCell>
                          {entry.warehouse.code}/{entry.location.code}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {entry.quantityChange > 0 ? "+" : ""}
                          {entry.quantityChange}
                        </TableCell>
                        {idx === 0 ? (
                          <TableCell rowSpan={m.entries.length} className="align-top">
                            {m.performedBy.name}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
