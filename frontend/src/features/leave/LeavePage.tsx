import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

const statusVariant: Record<string, "info" | "success" | "danger" | "warning"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "default" as any,
};

export function LeavePage() {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const { data: balance } = useQuery({
    queryKey: ["leave-balance"],
    queryFn: () => api.get("/leave/balance").then((r) => r.data),
  });

  const { data: types } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => api.get("/leave/types").then((r) => r.data),
  });

  const { data: requests } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: () => api.get("/leave").then((r) => r.data),
  });

  const applyMutation = useMutation({
    mutationFn: (body: any) => api.post("/leave", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-balance"] });
      setShowForm(false);
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      toast.success("Leave request submitted!");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error ?? "Failed to submit"),
  });

  const decideMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
    }) => api.patch(`/leave/${id}/decide`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Decision recorded");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error ?? "Failed"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/leave/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-balance"] });
      toast.success("Leave cancelled");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">Leave Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Apply for Leave"}
        </Button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(balance ?? []).map((b: any) => (
          <Card key={b.leaveTypeId} className="text-center">
            <p className="text-sm text-gray-500">{b.leaveTypeName}</p>
            <p className="mt-1 text-3xl font-bold text-brand-600">
              {b.remaining}
            </p>
            <p className="text-xs text-gray-400">
              {b.used} used / {b.total} total
            </p>
          </Card>
        ))}
      </div>

      {/* Apply form */}
      {showForm && (
        <Card>
          <CardTitle>New Leave Request</CardTitle>
          <form
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyMutation.mutate({
                leaveTypeId,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                reason,
              });
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Leave Type
              </label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                required
              >
                <option value="">Select type</option>
                {(types ?? []).map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div />
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief reason for leave"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={applyMutation.isPending}>
                {applyMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Requests table */}
      <Card>
        <CardTitle>
          {hasRole("MANAGER", "ADMIN") ? "Team Leave Requests" : "My Requests"}
        </CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700">
                <th className="pb-3 pr-4">Employee</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Dates</th>
                <th className="pb-3 pr-4">Days</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(requests ?? []).map((req: any) => (
                <tr key={req.id}>
                  <td className="py-3 pr-4 font-medium">{req.user?.name}</td>
                  <td className="py-3 pr-4">{req.leaveType?.name}</td>
                  <td className="py-3 pr-4 text-xs">
                    {new Date(req.startDate).toLocaleDateString()} –{" "}
                    {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">{req.days}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={statusVariant[req.status] ?? "default"}>
                      {req.status}
                    </Badge>
                  </td>
                  <td className="py-3 space-x-2">
                    {req.status === "PENDING" &&
                      hasRole("MANAGER", "ADMIN") &&
                      req.userId !== user?.id && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              decideMutation.mutate({
                                id: req.id,
                                status: "APPROVED",
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              decideMutation.mutate({
                                id: req.id,
                                status: "REJECTED",
                              })
                            }
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    {req.status === "PENDING" && req.userId === user?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelMutation.mutate(req.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!requests || requests.length === 0) && (
            <p className="py-8 text-center text-gray-400">
              No leave requests found
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
