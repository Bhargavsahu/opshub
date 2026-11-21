import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, CalendarDays, Package, AlertTriangle } from "lucide-react";

const COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981"];

export function DashboardPage() {
  const { user } = useAuth();

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get("/dashboard/summary").then((r) => r.data),
  });

  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => api.get("/dashboard/activity?limit=10").then((r) => r.data),
  });

  const taskChartData = summary?.tasksByStatus
    ? Object.entries(summary.tasksByStatus).map(([status, count]) => ({
        name: status.replace("_", " "),
        value: count as number,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Welcome back, {user?.name}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-2xl font-bold">{summary?.totalUsers ?? "—"}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900/30">
            <CalendarDays className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Leaves</p>
            <p className="text-2xl font-bold">
              {summary?.pendingLeaves ?? "—"}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
            <Package className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Inventory Items</p>
            <p className="text-2xl font-bold">{summary?.totalItems ?? "—"}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Low Stock Alerts</p>
            <p className="text-2xl font-bold">
              {summary?.lowStockCount ?? "—"}
            </p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Tasks by Status</CardTitle>
          {taskChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={taskChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-gray-400">No task data</p>
          )}
        </Card>

        <Card>
          <CardTitle>Task Distribution</CardTitle>
          {taskChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={taskChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {taskChartData.map((_entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-gray-400">No data</p>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardTitle>Recent Activity</CardTitle>
        <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
          {(activity ?? []).map((log: any) => (
            <div key={log.id} className="flex items-center gap-3 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium dark:bg-gray-800">
                {log.user?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{log.user?.name}</span>{" "}
                  <span className="text-gray-500">{log.action}</span>
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge>{log.action.split(".")[0]}</Badge>
            </div>
          ))}
          {(!activity || activity.length === 0) && (
            <p className="py-4 text-center text-gray-400">No recent activity</p>
          )}
        </div>
      </Card>
    </div>
  );
}
