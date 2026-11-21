import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Plus, ArrowUpCircle, ArrowDownCircle, Search } from "lucide-react";

export function InventoryPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [movementFor, setMovementFor] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [movementQty, setMovementQty] = useState("");
  const [movementNote, setMovementNote] = useState("");

  // Add item form
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQty, setNewQty] = useState("0");
  const [newReorder, setNewReorder] = useState("10");

  const { data: items } = useQuery({
    queryKey: ["inventory", search],
    queryFn: () =>
      api
        .get("/inventory", { params: { search: search || undefined } })
        .then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (body: any) => api.post("/inventory", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setShowAdd(false);
      toast.success("Item added!");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error ?? "Failed"),
  });

  const moveMutation = useMutation({
    mutationFn: ({
      itemId,
      body,
    }: {
      itemId: string;
      body: any;
    }) => api.post(`/inventory/${itemId}/movements`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setMovementFor(null);
      setMovementQty("");
      setMovementNote("");
      toast.success("Stock updated!");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold dark:text-white">Inventory</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {hasRole("MANAGER", "ADMIN") && (
            <Button onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Add item form */}
      {showAdd && (
        <Card>
          <CardTitle>New Inventory Item</CardTitle>
          <form
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate({
                name: newName,
                sku: newSku,
                category: newCategory || undefined,
                quantity: Number(newQty),
                reorderLevel: Number(newReorder),
              });
            }}
          >
            <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <Input label="SKU" value={newSku} onChange={(e) => setNewSku(e.target.value)} required />
            <Input label="Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <Input label="Initial Qty" type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            <Input label="Reorder Level" type="number" value={newReorder} onChange={(e) => setNewReorder(e.target.value)} />
            <div className="flex items-end">
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Stock movement modal-like card */}
      {movementFor && (
        <Card>
          <CardTitle>Record Stock Movement</CardTitle>
          <form
            className="mt-4 flex flex-wrap items-end gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              moveMutation.mutate({
                itemId: movementFor,
                body: {
                  type: movementType,
                  quantity: Number(movementQty),
                  note: movementNote || undefined,
                },
              });
            }}
          >
            <div className="flex gap-2">
              <Button
                type="button"
                variant={movementType === "IN" ? "primary" : "outline"}
                size="sm"
                onClick={() => setMovementType("IN")}
              >
                <ArrowUpCircle className="h-4 w-4" /> Stock In
              </Button>
              <Button
                type="button"
                variant={movementType === "OUT" ? "danger" : "outline"}
                size="sm"
                onClick={() => setMovementType("OUT")}
              >
                <ArrowDownCircle className="h-4 w-4" /> Stock Out
              </Button>
            </div>
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={movementQty}
              onChange={(e) => setMovementQty(e.target.value)}
              required
            />
            <Input
              label="Note"
              value={movementNote}
              onChange={(e) => setMovementNote(e.target.value)}
              placeholder="Reason"
            />
            <Button type="submit" disabled={moveMutation.isPending}>
              Confirm
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMovementFor(null)}
            >
              Cancel
            </Button>
          </form>
        </Card>
      )}

      {/* Items table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">SKU</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Qty</th>
                <th className="pb-3 pr-4">Reorder</th>
                <th className="pb-3 pr-4">Status</th>
                {hasRole("MANAGER", "ADMIN") && <th className="pb-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(items ?? []).map((item: any) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4 font-medium">{item.name}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{item.sku}</td>
                  <td className="py-3 pr-4">{item.category ?? "—"}</td>
                  <td className="py-3 pr-4 font-semibold">{item.quantity} {item.unit}</td>
                  <td className="py-3 pr-4">{item.reorderLevel}</td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={
                        item.quantity <= item.reorderLevel
                          ? "danger"
                          : "success"
                      }
                    >
                      {item.quantity <= item.reorderLevel
                        ? "Low Stock"
                        : "In Stock"}
                    </Badge>
                  </td>
                  {hasRole("MANAGER", "ADMIN") && (
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMovementFor(item.id)}
                      >
                        Move Stock
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {(!items || items.length === 0) && (
            <p className="py-8 text-center text-gray-400">
              No inventory items found
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
