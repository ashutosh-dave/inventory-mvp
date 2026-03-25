"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import { ClipboardList, ChevronDown, ChevronRight, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MOVEMENT_TYPES = ["STOCK_IN", "STOCK_OUT", "TRANSFER", "ADJUSTMENT"] as const;
const PAGE_SIZE = 50;

type Warehouse = {
  id: string;
  code: string;
  name: string;
  locations: unknown[];
};

type LedgerEntry = {
  quantityChange: number;
  openingQty: number;
  closingQty: number;
  unitCostSnapshot: string | number;
  product: { sku: string; name: string };
  batch: {
    batchNumber: string;
    expiryDate: string | null;
    unitCost: string | number | null;
  };
  warehouse: { code: string; name: string };
  location: { code: string; name: string; type: string };
};

type Movement = {
  id: string;
  type: string;
  sourceType: string;
  reasonCode: string | null;
  reasonNote: string | null;
  createdAt: string;
  performedBy: { name: string; email: string } | null;
  entries: LedgerEntry[];
};

type MovementsResponse = {
  data: Movement[];
  total: number;
  take: number;
  skip: number;
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatQty(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString()}`;
}

function summarizeProducts(entries: LedgerEntry[]): string {
  const skus = [...new Set(entries.map((e) => e.product.sku))];
  if (skus.length === 0) return "—";
  if (skus.length <= 2) return skus.join(", ");
  return `${skus.slice(0, 2).join(", ")} +${skus.length - 2}`;
}

function summarizeLocations(entries: LedgerEntry[]): string {
  const parts = entries.map(
    (e) => `${e.warehouse.code} / ${e.location.code}`,
  );
  const uniq = [...new Set(parts)];
  if (uniq.length === 0) return "—";
  if (uniq.length <= 2) return uniq.join(", ");
  return `${uniq.slice(0, 2).join(", ")} +${uniq.length - 2}`;
}

function summarizeQtyChange(entries: LedgerEntry[]): string {
  if (entries.length === 0) return "—";
  if (entries.length === 1) return formatQty(entries[0].quantityChange);
  const text = entries
    .slice(0, 3)
    .map((e) => formatQty(e.quantityChange))
    .join(" · ");
  return entries.length > 3 ? `${text} · …` : text;
}

function reasonLabel(m: Movement): string {
  const parts: string[] = [];
  if (m.reasonCode) parts.push(m.reasonCode.replace(/_/g, " "));
  if (m.reasonNote) parts.push(m.reasonNote);
  return parts.length ? parts.join(" — ") : "—";
}

function TypeBadge({ type }: { type: string }) {
  if (type === "STOCK_IN") {
    return (
      <Badge
        variant="default"
        className={cn(
          "border-transparent bg-success/10 text-success shadow-none hover:bg-success/15",
        )}
      >
        {type}
      </Badge>
    );
  }
  if (type === "STOCK_OUT") {
    return <Badge variant="destructive">{type}</Badge>;
  }
  if (type === "TRANSFER") {
    return <Badge variant="secondary">{type}</Badge>;
  }
  if (type === "ADJUSTMENT") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200",
        )}
      >
        {type}
      </Badge>
    );
  }
  return <Badge variant="outline">{type}</Badge>;
}

export default function AuditLogPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [warehousesError, setWarehousesError] = useState<string | null>(null);

  const [movementType, setMovementType] = useState<string>("__all__");
  const [skuInput, setSkuInput] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>("__all__");

  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [skuFilterError, setSkuFilterError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const appliedFilters = useMemo(
    () => ({
      movementType,
      sku: skuInput.trim(),
      warehouseId,
    }),
    [movementType, skuInput, warehouseId],
  );

  const loadWarehouses = useCallback(async () => {
    setWarehousesLoading(true);
    setWarehousesError(null);
    try {
      const res = await fetch("/api/warehouses");
      if (!res.ok) {
        setWarehousesError(await readErrorMessage(res));
        return;
      }
      const data = (await res.json()) as Warehouse[];
      setWarehouses(Array.isArray(data) ? data : []);
    } catch {
      setWarehousesError("Could not load warehouses.");
    } finally {
      setWarehousesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  const fetchMovements = useCallback(
    async (opts: { reset: boolean }) => {
      const { reset } = opts;
      const isInitialPage = reset;
      if (isInitialPage) {
        setListLoading(true);
        setSkuFilterError(null);
      } else {
        setLoadMoreLoading(true);
      }
      setListError(null);

      const skuTrimmed = appliedFilters.sku;
      let productId: string | undefined;

      if (skuTrimmed) {
        try {
          const pres = await fetch(
            `/api/products?sku=${encodeURIComponent(skuTrimmed)}`,
          );
          if (!pres.ok) {
            setListError(await readErrorMessage(pres));
            if (isInitialPage) setMovements([]);
            setTotal(0);
            return;
          }
          const products = (await pres.json()) as { id: string }[];
          if (!products.length) {
            setSkuFilterError(`No product found with SKU "${skuTrimmed}".`);
            if (isInitialPage) setMovements([]);
            setTotal(0);
            return;
          }
          productId = products[0].id;
        } catch {
          setListError("Could not resolve product SKU.");
          if (isInitialPage) setMovements([]);
          setTotal(0);
          return;
        }
      }

      const skip = reset ? 0 : movements.length;
      const params = new URLSearchParams();
      params.set("take", String(PAGE_SIZE));
      params.set("skip", String(skip));
      if (appliedFilters.movementType !== "__all__") {
        params.set("type", appliedFilters.movementType);
      }
      if (appliedFilters.warehouseId !== "__all__") {
        params.set("warehouseId", appliedFilters.warehouseId);
      }
      if (productId) {
        params.set("productId", productId);
      }

      try {
        const res = await fetch(`/api/inventory/movements?${params.toString()}`);
        if (!res.ok) {
          const msg = await readErrorMessage(res);
          setListError(msg);
          if (isInitialPage) setMovements([]);
          return;
        }
        const json = (await res.json()) as MovementsResponse;
        const page = Array.isArray(json.data) ? json.data : [];
        setTotal(typeof json.total === "number" ? json.total : 0);
        if (reset) {
          setMovements(page);
          setExpanded(new Set());
        } else {
          setMovements((prev) => [...prev, ...page]);
        }
      } catch {
        setListError("Could not load movements.");
        if (isInitialPage) setMovements([]);
      } finally {
        if (isInitialPage) setListLoading(false);
        else setLoadMoreLoading(false);
      }
    },
    [appliedFilters, movements.length],
  );

  useEffect(() => {
    void fetchMovements({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only; Search applies filters explicitly
  }, []);

  const onSearch = () => {
    void fetchMovements({ reset: true });
  };

  const toggleRow = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canLoadMore = movements.length < total;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Complete history of all inventory movements.
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="audit-movement-type">Movement type</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger id="audit-movement-type" className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-sku">Product SKU</Label>
              <Input
                id="audit-sku"
                placeholder="Exact SKU"
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-warehouse">Warehouse</Label>
              <Select
                value={warehouseId}
                onValueChange={setWarehouseId}
                disabled={warehousesLoading}
              >
                <SelectTrigger id="audit-warehouse" className="w-full">
                  <SelectValue
                    placeholder={warehousesLoading ? "Loading…" : "All warehouses"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All warehouses</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full sm:w-auto"
                onClick={onSearch}
                disabled={listLoading}
              >
                {listLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching
                  </>
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </div>
          {warehousesError ? (
            <p className="text-sm text-destructive">{warehousesError}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-2 pb-4">
          <CardTitle className="text-base">Stock transactions</CardTitle>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `Showing ${movements.length.toLocaleString()} of ${total.toLocaleString()}`
              : listLoading
                ? "Loading…"
                : "No results"}
          </p>
        </CardHeader>
        <CardContent>
          {listError ? (
            <p className="mb-4 text-sm text-destructive">{listError}</p>
          ) : null}
          {skuFilterError ? (
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">
              {skuFilterError}
            </p>
          ) : null}

          {listLoading && movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading movement history…</p>
            </div>
          ) : null}

          {!listLoading && movements.length === 0 && !skuFilterError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-50" />
              <p className="text-sm font-medium">No movements match your filters</p>
              <p className="text-xs">Try widening the filters or clear the SKU.</p>
            </div>
          ) : null}

          {movements.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Date / time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Qty change</TableHead>
                    <TableHead>Performed by</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const open = expanded.has(m.id);
                    const actor = m.performedBy;
                    return (
                      <Fragment key={m.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(m.id)}
                        >
                          <TableCell className="align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(m.id);
                              }}
                              aria-expanded={open}
                              aria-label={open ? "Collapse row" : "Expand row"}
                            >
                              {open ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(m.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <TypeBadge type={m.type} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {m.sourceType.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate text-sm">
                            {summarizeProducts(m.entries)}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate text-sm">
                            {summarizeLocations(m.entries)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {summarizeQtyChange(m.entries)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {actor ? (
                              <span className="block">
                                <span className="font-medium">{actor.name}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {actor.email}
                                </span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {reasonLabel(m)}
                          </TableCell>
                        </TableRow>
                        {open ? (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={9} className="p-0">
                              <div className="p-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Ledger entries
                                </p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Batch</TableHead>
                                      <TableHead>Warehouse / location</TableHead>
                                      <TableHead className="text-right">
                                        Opening qty
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Closing qty
                                      </TableHead>
                                      <TableHead className="text-right">Change</TableHead>
                                      <TableHead className="text-right">Unit cost</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {m.entries.map((e, idx) => (
                                      <TableRow key={`${m.id}-e-${idx}`}>
                                        <TableCell className="text-sm">
                                          <span className="font-medium">{e.product.sku}</span>
                                          <span className="block text-xs text-muted-foreground">
                                            {e.product.name}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {e.batch.batchNumber}
                                          {e.batch.expiryDate ? (
                                            <span className="block text-xs text-muted-foreground">
                                              Exp{" "}
                                              {new Date(
                                                e.batch.expiryDate,
                                              ).toLocaleDateString()}
                                            </span>
                                          ) : null}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {e.warehouse.code} — {e.warehouse.name}
                                          <span className="block text-xs text-muted-foreground">
                                            {e.location.code} ({e.location.type})
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                          {e.openingQty.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                          {e.closingQty.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                          {formatQty(e.quantityChange)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                          {formatMoney(e.unitCostSnapshot)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {movements.length > 0 && canLoadMore ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                disabled={loadMoreLoading}
                onClick={() => void fetchMovements({ reset: false })}
              >
                {loadMoreLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
