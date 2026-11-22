import { Router, Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import {
  createItemSchema,
  updateItemSchema,
  stockMovementSchema,
} from "./inventory.schema.js";
import {
  createItem,
  updateItem,
  recordStockMovement,
  getLowStockItems,
} from "./inventory.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

// List all items (everyone can read)
router.get("/", authenticate, asyncHandler(async (req: Request, res: Response) => {
  const search = req.query.search ? String(req.query.search) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) {
    where.category = category;
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
  });
  res.json(items);
}));

// Get single item with movements
router.get("/:id", authenticate, asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: String(req.params.id) },
    include: {
      movements: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
}));

// Low stock items (MANAGER, ADMIN)
router.get(
  "/alerts/low-stock",
  authenticate,
  requireRole("MANAGER", "ADMIN"),
  asyncHandler(async (_req: Request, res: Response) => {
    const items = await getLowStockItems();
    res.json(items);
  }),
);

// Create item (MANAGER, ADMIN)
router.post(
  "/",
  authenticate,
  requireRole("MANAGER", "ADMIN"),
  validate(createItemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const item = await createItem(req.body, req.user!.userId, req.ip);
    res.status(201).json(item);
  }),
);

// Update item (MANAGER, ADMIN)
router.patch(
  "/:id",
  authenticate,
  requireRole("MANAGER", "ADMIN"),
  validate(updateItemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const item = await updateItem(
      String(req.params.id),
      req.body,
      req.user!.userId,
      req.ip,
    );
    res.json(item);
  }),
);

// Record stock movement (MANAGER, ADMIN)
router.post(
  "/:id/movements",
  authenticate,
  requireRole("MANAGER", "ADMIN"),
  validate(stockMovementSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await recordStockMovement(
      String(req.params.id),
      req.body,
      req.user!.userId,
      req.ip,
    );
    res.status(201).json(result);
  }),
);

export default router;
