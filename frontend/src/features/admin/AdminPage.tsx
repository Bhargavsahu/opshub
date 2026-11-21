import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import { Shield, Users, User } from "lucide-react";

const roleIcons: Record<string, any> = {
  ADMIN: Shield,
  MANAGER: Users,
  EMPLOYEE: User,
};

export function AdminPage() {
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const { data: activity } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: () => api.get("/dashboard/activity?limit=50").then((r) => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">Admin Panel</h1>

      {/* Users */}
      <Card>
        <CardTitle>User Management</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(users ?? []).map((u: any) => {
                const Icon = roleIcons[u.role] ?? User;
                return (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{u.email}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          u.role === "ADMIN"
                            ? "danger"
                            : u.role === "MANAGER"
                              ? "info"
                              : "default"
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          roleMutation.mutate({
                            id: u.id,
                            role: e.target.value,
                          })
                        }
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardTitle>Audit Log</CardTitle>
        <div className="mt-4 max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700">
                <th className="pb-3 pr-4">Time</th>
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Action</th>
                <th className="pb-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(activity ?? []).map((log: any) => (
                <tr key={log.id}>
                  <td className="py-2 pr-4 text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">{log.user?.name}</td>
                  <td className="py-2 pr-4">
                    <Badge>{log.action}</Badge>
                  </td>
                  <td className="py-2 font-mono text-xs text-gray-500">
                    {log.entity ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
