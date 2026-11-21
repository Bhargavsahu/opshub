import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { logAudit } from "../../middleware/audit.js";
import { AppError } from "../../utils/errors.js";

const router = Router();

// List users (ADMIN: all, MANAGER: own reports, EMPLOYEE: minimal)
router.get("/", authenticate, async (req: Request, res: Response) => {
  const { role, userId } = req.user!;
  let where: any = { isActive: true };

  if (role === "MANAGER") {
    where = { OR: [{ managerId: userId }, { id: userId }], isActive: true };
  } else if (role === "EMPLOYEE") {
    where = { id: userId };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      managerId: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  res.json(users);
});

// Update user role (ADMIN only)
const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]),
});

router.patch(
  "/:id/role",
  authenticate,
  requireRole("ADMIN"),
  validate(updateRoleSchema),
  async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!user) throw AppError.notFound("User not found");

    const updated = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { role: req.body.role },
      select: { id: true, email: true, name: true, role: true },
    });

    await logAudit({
      userId: req.user!.userId,
      action: "user.roleChange",
      entity: `User:${updated.id}`,
      diff: { before: { role: user.role }, after: { role: updated.role } },
      ip: req.ip,
    });

    res.json(updated);
  },
);

// Assign manager (ADMIN only)
const assignManagerSchema = z.object({
  managerId: z.string().nullable(),
});

router.patch(
  "/:id/manager",
  authenticate,
  requireRole("ADMIN"),
  validate(assignManagerSchema),
  async (req: Request, res: Response) => {
    const updated = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { managerId: req.body.managerId },
      select: { id: true, name: true, managerId: true },
    });

    await logAudit({
      userId: req.user!.userId,
      action: "user.assignManager",
      entity: `User:${updated.id}`,
      diff: { managerId: req.body.managerId },
      ip: req.ip,
    });

    res.json(updated);
  },
);

// Deactivate user (ADMIN only)
router.patch(
  "/:id/deactivate",
  authenticate,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    const updated = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });

    await logAudit({
      userId: req.user!.userId,
      action: "user.deactivate",
      entity: `User:${updated.id}`,
      ip: req.ip,
    });

    res.json(updated);
  },
);

export default router;
