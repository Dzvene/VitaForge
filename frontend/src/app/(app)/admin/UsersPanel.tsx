"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { admin } from "@/lib/api/endpoints";
import { Badge, Button, Card, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export function UsersPanel() {
  const qc = useQueryClient();
  const toast = useToast();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: admin.users });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { role?: string; is_active?: boolean } }) =>
      admin.patchUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast("User updated", "ok");
    },
    onError: () => toast("Update failed", "error"),
  });

  if (users.isLoading) return <Skeleton className="h-48" />;

  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-faint">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{u.full_name || u.email}</p>
                  <p className="text-xs text-ink-faint">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.role === "admin" ? "brand" : "neutral"}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.is_active ? "ok" : "danger"}>{u.is_active ? "active" : "disabled"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => patch.mutate({ id: u.id, body: { role: u.role === "admin" ? "user" : "admin" } })}
                    >
                      {u.role === "admin" ? "Make user" : "Make admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.is_active ? "danger" : "secondary"}
                      onClick={() => patch.mutate({ id: u.id, body: { is_active: !u.is_active } })}
                    >
                      {u.is_active ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
