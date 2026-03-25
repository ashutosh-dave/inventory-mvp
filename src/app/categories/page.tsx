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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Inbox,
  Loader2,
  Pencil,
  Tags,
  Trash2,
  XCircle,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  description: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CategoryPayload = { name: string; description?: string };

async function parseErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (body && typeof body.error === "string") return body.error;
  return "Something went wrong.";
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await parseErrorMessage(res),
        });
        return;
      }
      const data = (await res.json()) as Category[];
      setCategories(
        data.filter((c) => c.deletedAt == null).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.deletedAt == null),
    [categories],
  );
  const hasRows = visibleCategories.length > 0;

  function openCreate() {
    setMessage(null);
    setDialogMode("create");
    setEditingId(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setMessage(null);
    setDialogMode("edit");
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description ?? "");
    setDialogOpen(true);
  }

  function buildPayload(): CategoryPayload {
    const trimmedName = name.trim();
    const desc = description.trim();
    const payload: CategoryPayload = { name: trimmedName };
    if (dialogMode === "edit") {
      payload.description = desc;
    } else if (desc) {
      payload.description = desc;
    }
    return payload;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload.name) {
      setMessage({ type: "error", text: "Name is required." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (dialogMode === "create") {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setMessage({
            type: "error",
            text: await parseErrorMessage(res),
          });
          return;
        }
        setMessage({ type: "success", text: "Category created." });
        setDialogOpen(false);
        await loadCategories();
        return;
      }

      if (!editingId) {
        setMessage({ type: "error", text: "Missing category to update." });
        return;
      }
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await parseErrorMessage(res),
        });
        return;
      }
      setMessage({ type: "success", text: "Category updated." });
      setDialogOpen(false);
      await loadCategories();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "Delete this category? It will be soft-deleted and hidden from lists.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await parseErrorMessage(res),
        });
        return;
      }
      setMessage({ type: "success", text: "Category deleted." });
      await loadCategories();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
            <p className="text-sm text-muted-foreground">
              Manage product categories.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>Add Category</Button>
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
          <CardTitle className="text-base">All categories</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadCategories()}
            disabled={loading}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin opacity-60" />
              Loading categories...
            </div>
          ) : !hasRows ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40" />
              <div className="text-sm font-medium">No categories yet</div>
              <div className="text-xs text-center max-w-sm">
                Add a category to organize products. Deleted categories are not
                shown here.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCategories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-md">
                        {c.description?.trim() ? c.description : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(c)}
                            disabled={saving || deletingId === c.id}
                          >
                            <Pencil className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(c.id)}
                            disabled={deletingId === c.id || saving}
                          >
                            {deletingId === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 sm:mr-1" />
                            )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={(e) => void handleSave(e)}>
            <DialogHeader>
              <DialogTitle>
                {dialogMode === "create" ? "Add category" : "Edit category"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electronics"
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
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
                ) : dialogMode === "create" ? (
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
