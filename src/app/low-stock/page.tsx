"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Inbox, XCircle } from "lucide-react";

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
  if (status === "RESOLVED") return "secondary" as const;
  if (status === "ACKNOWLEDGED") return "outline" as const;
  return "destructive" as const;
}

export default function LowStockPage() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadAlerts() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/low-stock-alerts?status=OPEN");
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to load alerts." });
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
      setMessage({ type: "error", text: err?.error ?? "Action failed." });
      return;
    }
    setMessage({
      type: "success",
      text: action === "ACKNOWLEDGE" ? "Alert acknowledged." : "Alert resolved.",
    });
    await loadAlerts();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Low Stock Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Acknowledge or resolve items below reorder point.
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

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Open Alerts</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void loadAlerts()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading alerts...
            </div>
          ) : !hasAlerts ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40" />
              <div className="text-sm font-medium">No open alerts</div>
              <div className="text-xs">
                All stock levels are above reorder points.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                          {a.warehouse?.code ?? "—"} /{" "}
                          {a.location?.code ?? "—"}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
