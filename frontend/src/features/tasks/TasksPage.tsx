import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";

const statusColors: Record<string, "info" | "warning" | "success" | "default"> = {
  TODO: "default" as any,
  IN_PROGRESS: "info",
  REVIEW: "warning",
  DONE: "success",
};

const priorityColors: Record<string, "danger" | "warning" | "info" | "default"> = {
  URGENT: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "default" as any,
};

// Valid transitions for buttons
const transitions: Record<string, { label: string; to: string }[]> = {
  TODO: [{ label: "Start", to: "IN_PROGRESS" }],
  IN_PROGRESS: [
    { label: "Send to Review", to: "REVIEW" },
    { label: "Back to Todo", to: "TODO" },
  ],
  REVIEW: [
    { label: "Done", to: "DONE" },
    { label: "Back to Progress", to: "IN_PROGRESS" },
  ],
  DONE: [{ label: "Reopen", to: "TODO" }],
};

export function TasksPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const [assigneeId, setAssigneeId] = useState("");

  const { data: tasks } = useQuery({
    queryKey: ["tasks", filterStatus],
    queryFn: () =>
      api
        .get("/tasks", { params: { status: filterStatus || undefined } })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("/tasks", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setTitle("");
      setDescription("");
      toast.success("Task created!");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error ?? "Failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold dark:text-white">Tasks</h1>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">All statuses</option>
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="DONE">Done</option>
          </select>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardTitle>Create Task</CardTitle>
          <form
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                title,
                description: description || undefined,
                priority,
                assigneeId: assigneeId || undefined,
              });
            }}
          >
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Assign to
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Unassigned</option>
                {(users ?? []).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Task list */}
      <div className="space-y-3">
        {(tasks ?? []).map((task: any) => (
          <Card key={task.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{task.title}</span>
                <Badge variant={priorityColors[task.priority] ?? "default"}>
                  {task.priority}
                </Badge>
                <Badge variant={statusColors[task.status] ?? "default"}>
                  {task.status.replace("_", " ")}
                </Badge>
              </div>
              {task.description && (
                <p className="mt-1 text-sm text-gray-500">{task.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                {task.assignee
                  ? `Assigned to ${task.assignee.name}`
                  : "Unassigned"}{" "}
                · Created by {task.createdBy?.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(transitions[task.status] ?? []).map((t) => (
                <Button
                  key={t.to}
                  size="sm"
                  variant={t.to === "DONE" ? "primary" : "outline"}
                  onClick={() =>
                    statusMutation.mutate({ id: task.id, status: t.to })
                  }
                  disabled={statusMutation.isPending}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </Card>
        ))}
        {(!tasks || tasks.length === 0) && (
          <p className="py-8 text-center text-gray-400">No tasks found</p>
        )}
      </div>
    </div>
  );
}
