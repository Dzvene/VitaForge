"use client";

import { useEffect, useState } from "react";
import { admin, type AdminUser } from "@/lib/api";
import { Badge, Button, Card, Input, Spinner } from "@/components/primitives";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => admin.users().then(setUsers).catch(() => setError(true));
  useEffect(() => {
    load();
  }, []);

  const patch = async (u: AdminUser, body: { role?: string; is_active?: boolean }) => {
    setBusy(u.id);
    try {
      const updated = await admin.patchUser(u.id, body);
      setUsers((prev) => prev?.map((x) => (x.id === u.id ? updated : x)) ?? null);
    } catch {
      /* keep UI as-is; a reload would resync */
    } finally {
      setBusy(null);
    }
  };

  const filtered = (users ?? []).filter(
    (u) => !q || u.email.toLowerCase().includes(q.toLowerCase()) || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Platform</p>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        </div>
        <div className="w-full sm:w-64">
          <Input placeholder="Search email or name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      {error ? (
        <Card>
          <p className="text-sm text-danger">Couldn&apos;t load users.</p>
        </Card>
      ) : !users ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-xs text-ink-faint">{u.email}</p>}
                    {!u.email_verified && <span className="text-[11px] text-warn">unverified</span>}
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? <Badge tone="brand">admin</Badge> : <Badge>user</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? <Badge tone="ok">active</Badge> : <Badge tone="danger">disabled</Badge>}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="h-8 px-3"
                        loading={busy === u.id}
                        onClick={() => patch(u, { role: u.role === "admin" ? "user" : "admin" })}
                      >
                        {u.role === "admin" ? "Make user" : "Make admin"}
                      </Button>
                      <Button
                        variant={u.is_active ? "danger" : "secondary"}
                        className="h-8 px-3"
                        loading={busy === u.id}
                        onClick={() => patch(u, { is_active: !u.is_active })}
                      >
                        {u.is_active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-faint">
                    No users match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
