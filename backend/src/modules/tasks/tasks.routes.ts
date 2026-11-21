import { Router, Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  createTaskSchema,
  updateTaskSchema,
  changeStatusSchema,
} from "./tasks.schema.js";
import { changeTaskStatus } from "./tasks.service.js";
import { logAudit } from "../../middleware/audit.js";

const router = Router();

// List tasks (scoped by role)
router.get("/", authenticate, async (req: Request, res: Response) => {
  const { role, userId } = req.user!;
  let where: any = {};

  if (role === "EMPLOYEE") {
    where = { OR: [{ assigneeId: userId }, { createdById: userId }] };
  } else if (role === "MANAGER") {
    // Manager sees tasks assigned to self + direct reports
    const reports = await prisma.user.findMany({
      where: { managerId: userId },
      select: { id: true },
    });
    const reportIds = reports.map((r) => r.id);
    where = {
      OR: [
        { assigneeId: { in: [userId, ...reportIds] } },
        { createdById: userId },
      ],
    };
  }
  // ADMIN sees all

  const status = req.query.status ? String(req.query.status) : undefined;
  if (status) where.status = status;

  const priority = req.query.priority ? String(req.query.priority) : undefined;
  if (priority) where.priority = priority;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  res.json(tasks);
});

// Create task
router.post(
  "/",
  authenticate,
  validate(createTaskSchema),
  async (req: Request, res: Response) => {
    const task = await prisma.task.create({
      data: {
        ...req.body,
        createdById: req.user!.userId,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user!.userId,
      action: "task.create",
      entity: `Task:${task.id}`,
      diff: { title: task.title, assigneeId: task.assigneeId },
      ip: req.ip,
    });

    res.status(201).json(task);
  },
);

// Update task details
router.patch(
  "/:id",
  authenticate,
  validate(updateTaskSchema),
  async (req: Request, res: Response) => {
    const task = await prisma.task.update({
      where: { id: String(req.params.id) },
      data: {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.json(task);
  },
);

// Change task status (button-driven state machine)
router.patch(
  "/:id/status",
  authenticate,
  validate(changeStatusSchema),
  async (req: Request, res: Response) => {
    const updated = await changeTaskStatus(
      String(req.params.id),
      req.body.status,
      req.user!.userId,
      req.ip,
    );
    res.json(updated);
  },
);

// Delete task (creator or ADMIN)
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (task.createdById !== req.user!.userId && req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Only the creator or an admin can delete" });
    return;
  }

  await prisma.task.delete({ where: { id } });
  res.json({ message: "Deleted" });
});

export default router;
