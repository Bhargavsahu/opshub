import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  unit: z.string().max(20).default("pcs"),
  quantity: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(10),
  category: z.string().max(100).optional(),
});

export const updateItemSchema = createItemSchema.partial().omit({ sku: true });

export const stockMovementSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.number().int().positive("Quantity must be positive"),
  note: z.string().max(500).optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
