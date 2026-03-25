"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Inbox,
  Loader2,
  Package,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";

type Product = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  baseUnitId: string;
  reorderPoint: number;
  isActive: boolean;
  category: { id: string; name: string };
  baseUnit: { id: string; code: string; name: string };
  batches: unknown[];
};

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type ProductFormState = {
  sku: string;
  name: string;
  categoryId: string;
  baseUnitId: string;
  reorderPoint: number;
  isActive: boolean;
};

const emptyForm = (): ProductFormState => ({
  sku: "",
  name: "",
  categoryId: "",
  baseUnitId: "",
  reorderPoint: 0,
  isActive: true,
});

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await readErrorMessage(res),
        });
        return;
      }
      const data = (await res.json()) as Product[];
      setProducts(data);
    } catch {
      setMessage({
        type: "error",
        text: "Could not load products. Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await readErrorMessage(res),
        });
        return;
      }
      const data = (await res.json()) as Category[];
      setCategories(data);
    } catch {
      setMessage({
        type: "error",
        text: "Could not load categories.",
      });
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
    void loadCategories();
  }, [loadProducts, loadCategories]);

  const hasProducts = useMemo(() => products.length > 0, [products.length]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      categoryId: product.categoryId,
      baseUnitId: product.baseUnitId,
      reorderPoint: product.reorderPoint,
      isActive: product.isActive,
    });
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setForm(emptyForm());
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (form.sku.trim().length < 2 || form.name.trim().length < 2) {
      setMessage({
        type: "error",
        text: "SKU and name must be at least 2 characters.",
      });
      return;
    }
    if (!form.categoryId) {
      setMessage({ type: "error", text: "Please select a category." });
      return;
    }
    if (!form.baseUnitId.trim()) {
      setMessage({ type: "error", text: "Base unit ID is required." });
      return;
    }

    const body = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      categoryId: form.categoryId,
      baseUnitId: form.baseUnitId.trim(),
      reorderPoint: form.reorderPoint,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      const url =
        editingId === null
          ? "/api/products"
          : `/api/products/${editingId}`;
      const res = await fetch(url, {
        method: editingId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setMessage({
          type: "error",
          text: await readErrorMessage(res),
        });
        return;
      }

      setMessage({
        type: "success",
        text:
          editingId === null
            ? "Product created successfully."
            : "Product updated successfully.",
      });
      handleDialogOpenChange(false);
      await loadProducts();
    } catch {
      setMessage({
        type: "error",
        text: "Save failed. Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (
      !window.confirm(
        `Delete product "${product.name}" (${product.sku})? This marks it as deleted.`,
      )
    ) {
      return;
    }

    setMessage(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await readErrorMessage(res),
        });
        return;
      }
      setMessage({ type: "success", text: "Product deleted." });
      await loadProducts();
    } catch {
      setMessage({
        type: "error",
        text: "Delete failed. Check your connection and try again.",
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground">
              Manage your product catalog.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>Add Product</Button>
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
          <CardTitle className="text-base">Catalog</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessage(null);
              void loadProducts();
            }}
            disabled={loading}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin opacity-60" />
              Loading products...
            </div>
          ) : !hasProducts ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40" />
              <div className="text-sm font-medium">No products yet</div>
              <div className="text-xs text-center max-w-sm">
                Add your first product to start tracking inventory, batches, and
                stock levels.
              </div>
              <Button className="mt-2" size="sm" onClick={openCreate}>
                Add Product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Base unit</TableHead>
                    <TableHead className="text-right">Reorder</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.sku}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.category?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">
                          {p.baseUnit?.code ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.baseUnit?.name ?? ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.reorderPoint}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "default" : "secondary"}>
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.batches?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.sku}`}
                          >
                            <Pencil className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(p)}
                            aria-label={`Delete ${p.sku}`}
                          >
                            <Trash2 className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Delete</span>
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void handleSubmit(e)}>
            <DialogHeader>
              <DialogTitle>
                {editingId === null ? "Add product" : "Edit product"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="product-sku">SKU</Label>
                <Input
                  id="product-sku"
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  autoComplete="off"
                  required
                  minLength={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-name">Name</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  autoComplete="off"
                  required
                  minLength={2}
                />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={form.categoryId || undefined}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, categoryId: v }))
                  }
                  disabled={categoriesLoading || categories.length === 0}
                >
                  <SelectTrigger id="product-category">
                    <SelectValue
                      placeholder={
                        categoriesLoading
                          ? "Loading categories..."
                          : categories.length === 0
                            ? "No categories available"
                            : "Select a category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-base-unit">Base unit ID</Label>
                <Input
                  id="product-base-unit"
                  value={form.baseUnitId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, baseUnitId: e.target.value }))
                  }
                  placeholder="Unit CUID"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-reorder">Reorder point</Label>
                <Input
                  id="product-reorder"
                  type="number"
                  min={0}
                  step={1}
                  value={Number.isNaN(form.reorderPoint) ? "" : form.reorderPoint}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setForm((f) => ({
                      ...f,
                      reorderPoint: Number.isNaN(v) ? 0 : Math.max(0, v),
                    }));
                  }}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="product-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border border-input accent-primary"
                />
                <Label htmlFor="product-active" className="font-normal cursor-pointer">
                  Active
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingId === null ? (
                  "Create"
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
