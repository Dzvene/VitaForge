"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { admin } from "@/lib/api/endpoints";
import { Badge, Button, Card, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export function UsersPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: admin.users });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { role?: string; is_active?: boolean } }) =>
      admin.patchUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast(t("admin.users.updated"), "ok");
    },
    onError: () => toast(t("admin.users.updateFailed"), "error"),
  });

  if (users.isLoading) return <Skeleton className="h-48" />;

  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-faint">
              <th className="px-4 py-3 font-medium">{t("admin.users.columns.user")}</th>
              <th className="px-4 py-3 font-medium">{t("admin.users.columns.role")}</th>
              <th className="px-4 py-3 font-medium">{t("admin.users.columns.status")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("admin.users.columns.actions")}</th>
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
                  <Badge tone={u.role === "admin" ? "brand" : "neutral"}>
                    {u.role === "admin" ? t("admin.users.role.admin") : t("admin.users.role.user")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.is_active ? "ok" : "danger"}>{u.is_active ? t("admin.users.status.active") : t("admin.users.status.disabled")}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => patch.mutate({ id: u.id, body: { role: u.role === "admin" ? "user" : "admin" } })}
                    >
                      {u.role === "admin" ? t("admin.users.makeUser") : t("admin.users.makeAdmin")}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.is_active ? "danger" : "secondary"}
                      onClick={() => patch.mutate({ id: u.id, body: { is_active: !u.is_active } })}
                    >
                      {u.is_active ? t("admin.users.disable") : t("admin.users.enable")}
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
