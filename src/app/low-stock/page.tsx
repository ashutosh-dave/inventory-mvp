"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type LowStockAlert = {
  id: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  triggerQty: number;
  reorderPoint: number;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  product?: { id: string; sku: string; name: string } | null;
  warehouse?: { id: string; code: string; name: string } | null;
  location?: { id: string; code: string; name: string; type: string } | null;
};

function statusBadgeVariant(status: LowStockAlert["status"]) {
  if (status === "RESOLVED") return "secondary";
  if (status === "ACKNOWLEDGED") return "outline";
  return "destructive";
}

export default function LowStockPage() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAlerts() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/low-stock-alerts?status=OPEN");
      if (!res.ok) {
        setMessage("Failed to load alerts.");
        return;
      }
      const data = (await res.json()) as LowStockAlert[];
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  const hasAlerts = useMemo(() => alerts.length > 0, [alerts.length]);

  async function act(alertId: string, action: "ACKNOWLEDGE" | "RESOLVE") {
    setMessage(null);
    const res = await fetch(`/api/low-stock-alerts/${alertId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMessage(err?.error ?? "Action failed.");
      return;
    }
    await loadAlerts();
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <h1 className="mb-2 text-2xl font-semibold">Low Stock Alerts</h1>
      <p className="mb-6 text-muted-foreground">
        Acknowledge items under review, or resolve once stock is corrected.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Open Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : !hasAlerts ? (
            <div className="text-sm text-muted-foreground">
              No open alerts right now.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">
                        {a.product?.sku ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.product?.name ?? ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {a.warehouse?.code ?? "—"} / {a.location?.code ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.location?.name ?? ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        Reorder at {a.reorderPoint}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Trigger qty: {a.triggerQty}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(a.status)}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void act(a.id, "ACKNOWLEDGE")}
                          disabled={a.status !== "OPEN"}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void act(a.id, "RESOLVE")}
                          disabled={a.status === "RESOLVED"}
                        >
                          Resolve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {message ? (
            <div className="mt-4 rounded-lg border p-3 text-sm">{message}</div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

