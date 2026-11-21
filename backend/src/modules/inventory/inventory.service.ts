import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { logAudit } from "../../middleware/audit.js";
import { CreateItemInput, StockMovementInput } from "./inventory.schema.js";

export async function createItem(input: CreateItemInput, userId: string, ip?: string) {
  const existing = await prisma.inventoryItem.findUnique({
    where: { sku: input.sku },
  });
  if (existing) {
    throw AppError.conflict(`SKU '${input.sku}' already exists`);
  }

  const item = await prisma.inventoryItem.create({ data: input });

  await logAudit({
    userId,
    action: "inventory.create",
    entity: `InventoryItem:${item.id}`,
    diff: { item: input },
    ip,
  });

  return item;
}

export async function updateItem(
  id: string,
  input: Partial<CreateItemInput>,
  userId: string,
  ip?: string,
) {
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) throw AppError.notFound("Item not found");

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: input,
  });

  await logAudit({
    userId,
    action: "inventory.update",
    entity: `InventoryItem:${id}`,
    diff: { before: item, after: updated },
    ip,
  });

  return updated;
}

export async function recordStockMovement(
  itemId: string,
  input: StockMovementInput,
  userId: string,
  ip?: string,
) {
  // Use a transaction to ensure stock + movement are consistent
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw AppError.notFound("Item not found");

    let newQuantity: number;
    switch (input.type) {
      case "IN":
        newQuantity = item.quantity + input.quantity;
        break;
      case "OUT":
        newQuantity = item.quantity - input.quantity;
        if (newQuantity < 0) {
          throw AppError.badRequest(
            `Insufficient stock: ${item.quantity} available, tried to remove ${input.quantity}`,
          );
        }
        break;
      case "ADJUST":
        newQuantity = input.quantity; // absolute set
        break;
    }

    const updatedItem = await tx.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
    });

    const movement = await tx.stockMovement.create({
      data: {
        itemId,
        type: input.type,
        quantity: input.quantity,
        note: input.note,
      },
    });

    await logAudit({
      userId,
      action: `inventory.stock${input.type}`,
      entity: `InventoryItem:${itemId}`,
      diff: {
        before: { quantity: item.quantity },
        after: { quantity: newQuantity },
        movement: { type: input.type, quantity: input.quantity },
      },
      ip,
    });

    return { item: updatedItem, movement };
  });
}

export async function getLowStockItems() {
  return prisma.$queryRaw`
    SELECT id, name, sku, quantity, "reorderLevel", category
    FROM inventory_items
    WHERE quantity <= "reorderLevel"
    ORDER BY (quantity::float / NULLIF("reorderLevel", 0)) ASC
  `;
}
