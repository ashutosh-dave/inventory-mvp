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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";

const NO_DEPT_VALUE = "__none__";

type Department = {
  id: string;
  name: string;
  description: string | null;
  teams: Array<{ id: string; name: string }>;
};

type Team = {
  id: string;
  name: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  members: Array<{ id: string }>;
};

type DeleteTarget =
  | { kind: "department"; id: string; label: string }
  | { kind: "team"; id: string; label: string };

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body?.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export default function TeamsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [departmentsForbidden, setDepartmentsForbidden] = useState(false);
  const [teamsForbidden, setTeamsForbidden] = useState(false);
  const [departmentsLoadError, setDepartmentsLoadError] = useState<string | null>(
    null,
  );
  const [teamsLoadError, setTeamsLoadError] = useState<string | null>(null);

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(
    null,
  );
  const [deptName, setDeptName] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptFormError, setDeptFormError] = useState<string | null>(null);

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDepartmentId, setTeamDepartmentId] = useState<string | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    setLoadingDepartments(true);
    setDepartmentsLoadError(null);
    try {
      const res = await fetch("/api/departments");
      if (res.status === 403) {
        setDepartmentsForbidden(true);
        setDepartments([]);
        return;
      }
      setDepartmentsForbidden(false);
      if (!res.ok) {
        setDepartmentsLoadError(await readErrorMessage(res));
        return;
      }
      const data = (await res.json()) as Department[];
      setDepartments(data);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true);
    setTeamsLoadError(null);
    try {
      const res = await fetch("/api/teams");
      if (res.status === 403) {
        setTeamsForbidden(true);
        setTeams([]);
        return;
      }
      setTeamsForbidden(false);
      if (!res.ok) {
        setTeamsLoadError(await readErrorMessage(res));
        return;
      }
      const data = (await res.json()) as Team[];
      setTeams(data);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
    void loadTeams();
  }, [loadDepartments, loadTeams]);

  async function refreshAll() {
    await Promise.all([loadDepartments(), loadTeams()]);
  }

  function openAddDepartment() {
    setEditingDepartmentId(null);
    setDeptName("");
    setDeptDescription("");
    setDeptFormError(null);
    setDeptDialogOpen(true);
  }

  function openEditDepartment(row: Department) {
    setEditingDepartmentId(row.id);
    setDeptName(row.name);
    setDeptDescription(row.description ?? "");
    setDeptFormError(null);
    setDeptDialogOpen(true);
  }

  async function submitDepartment() {
    setDeptFormError(null);
    const name = deptName.trim();
    if (name.length < 2) {
      setDeptFormError("Name must be at least 2 characters.");
      return;
    }
    const description = deptDescription.trim() || undefined;
    setDeptSaving(true);
    try {
      const url =
        editingDepartmentId === null
          ? "/api/departments"
          : `/api/departments/${editingDepartmentId}`;
      const method = editingDepartmentId === null ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        setDeptFormError(await readErrorMessage(res));
        return;
      }
      setDeptDialogOpen(false);
      await refreshAll();
    } finally {
      setDeptSaving(false);
    }
  }

  function openAddTeam() {
    setEditingTeamId(null);
    setTeamName("");
    setTeamDepartmentId(null);
    setTeamFormError(null);
    setTeamDialogOpen(true);
  }

  function openEditTeam(row: Team) {
    setEditingTeamId(row.id);
    setTeamName(row.name);
    setTeamDepartmentId(row.departmentId);
    setTeamFormError(null);
    setTeamDialogOpen(true);
  }

  async function submitTeam() {
    setTeamFormError(null);
    const name = teamName.trim();
    if (name.length < 2) {
      setTeamFormError("Name must be at least 2 characters.");
      return;
    }
    const body: { name: string; departmentId?: string | null } = { name };
    body.departmentId = teamDepartmentId ?? null;
    setTeamSaving(true);
    try {
      const url =
        editingTeamId === null ? "/api/teams" : `/api/teams/${editingTeamId}`;
      const method = editingTeamId === null ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setTeamFormError(await readErrorMessage(res));
        return;
      }
      setTeamDialogOpen(false);
      await refreshAll();
    } finally {
      setTeamSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      const path =
        deleteTarget.kind === "department"
          ? `/api/departments/${deleteTarget.id}`
          : `/api/teams/${deleteTarget.id}`;
      const res = await fetch(path, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError(await readErrorMessage(res));
        return;
      }
      setDeleteTarget(null);
      await refreshAll();
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Teams & Departments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage organizational structure.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
            <CardTitle className="text-base">Departments</CardTitle>
            {!departmentsForbidden && !loadingDepartments ? (
              <Button size="sm" onClick={openAddDepartment}>
                Add Department
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {loadingDepartments ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : departmentsForbidden ? (
              <p className="text-sm text-muted-foreground">
                Insufficient permissions
              </p>
            ) : departmentsLoadError ? (
              <p className="text-sm text-destructive">{departmentsLoadError}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Teams count
                    </TableHead>
                    <TableHead className="w-[140px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No departments yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="max-w-[280px] truncate text-muted-foreground">
                          {d.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.teams?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDepartment(d)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "department",
                                  id: d.id,
                                  label: d.name,
                                })
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
            <CardTitle className="text-base">Teams</CardTitle>
            {!teamsForbidden && !loadingTeams ? (
              <Button size="sm" onClick={openAddTeam}>
                Add Team
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {loadingTeams ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : teamsForbidden ? (
              <p className="text-sm text-muted-foreground">
                Insufficient permissions
              </p>
            ) : teamsLoadError ? (
              <p className="text-sm text-destructive">{teamsLoadError}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Members count
                    </TableHead>
                    <TableHead className="w-[140px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No teams yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.department?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.members?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditTeam(t)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "team",
                                  id: t.id,
                                  label: t.name,
                                })
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartmentId === null
                ? "Add department"
                : "Edit department"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dept-desc">Description (optional)</Label>
              <Textarea
                id="dept-desc"
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
                rows={3}
              />
            </div>
            {deptFormError ? (
              <p className="text-sm text-destructive">{deptFormError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeptDialogOpen(false)}
              disabled={deptSaving}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitDepartment()} disabled={deptSaving}>
              {deptSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeamId === null ? "Add team" : "Edit team"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label>Department (optional)</Label>
              <Select
                value={teamDepartmentId ?? NO_DEPT_VALUE}
                onValueChange={(v) =>
                  setTeamDepartmentId(v === NO_DEPT_VALUE ? null : v)
                }
                disabled={departmentsForbidden}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPT_VALUE}>No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {teamFormError ? (
              <p className="text-sm text-destructive">{teamFormError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTeamDialogOpen(false)}
              disabled={teamSaving}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitTeam()} disabled={teamSaving}>
              {teamSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget?.kind === "department" ? "department" : "team"}
              ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.label}
            </span>
            .
          </p>
          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
