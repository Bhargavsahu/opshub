import { Router, Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";

const router = Router();

// Dashboard summary (role-scoped)
router.get("/summary", authenticate, async (req: Request, res: Response) => {
  const { role, userId } = req.user!;

  // Active users count
  const totalUsers = await prisma.user.count({ where: { isActive: true } });

  // Leave stats
  let leaveWhere: any = {};
  if (role === "EMPLOYEE") leaveWhere = { userId };
  else if (role === "MANAGER") leaveWhere = { user: { managerId: userId } };

  const pendingLeaves = await prisma.leaveRequest.count({
    where: { ...leaveWhere, status: "PENDING" },
  });

  // Task stats
  let taskWhere: any = {};
  if (role === "EMPLOYEE") {
    taskWhere = { OR: [{ assigneeId: userId }, { createdById: userId }] };
  } else if (role === "MANAGER") {
    const reports = await prisma.user.findMany({
      where: { managerId: userId },
      select: { id: true },
    });
    const ids = [userId, ...reports.map((r) => r.id)];
    taskWhere = { assigneeId: { in: ids } };
  }

  const tasksByStatus = await prisma.task.groupBy({
    by: ["status"],
    where: taskWhere,
    _count: true,
  });

  // Inventory stats
  const totalItems = await prisma.inventoryItem.count();
  const lowStockCount = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint as count FROM inventory_items
    WHERE quantity <= "reorderLevel"
  `;

  res.json({
    totalUsers,
    pendingLeaves,
    tasksByStatus: Object.fromEntries(
      tasksByStatus.map((t) => [t.status, t._count]),
    ),
    totalItems,
    lowStockCount: Number(lowStockCount[0]?.count ?? 0),
  });
});

// Recent activity (audit log, ADMIN only shown full, others see own)
router.get("/activity", authenticate, async (req: Request, res: Response) => {
  const { role, userId } = req.user!;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = role === "ADMIN" ? {} : { userId };

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json(logs);
});

export default router;
