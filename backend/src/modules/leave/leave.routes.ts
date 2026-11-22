import { Router, Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createLeaveSchema, decideLeaveSchema } from "./leave.schema.js";
import {
  getLeaveBalance,
  createLeaveRequest,
  decideLeaveRequest,
  cancelLeaveRequest,
} from "./leave.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

// Get leave types
router.get("/types", authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const types = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
  res.json(types);
}));

// Get my leave balance
router.get("/balance", authenticate, asyncHandler(async (req: Request, res: Response) => {
  const balance = await getLeaveBalance(req.user!.userId);
  res.json(balance);
}));

// List leave requests (scoped by role)
router.get("/", authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { role, userId } = req.user!;
  let where: any = {};

  if (role === "EMPLOYEE") {
    where = { userId };
  } else if (role === "MANAGER") {
    where = { user: { managerId: userId } };
  }
  // ADMIN sees all

  const status = String(req.query.status ?? "");
  if (status) where.status = status;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      leaveType: true,
      user: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
}));

// Apply for leave
router.post(
  "/",
  authenticate,
  validate(createLeaveSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const request = await createLeaveRequest(
      req.user!.userId,
      req.body,
      req.ip,
    );
    res.status(201).json(request);
  }),
);

// Approve / reject
router.patch(
  "/:id/decide",
  authenticate,
  requireRole("MANAGER", "ADMIN"),
  validate(decideLeaveSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await decideLeaveRequest(
      String(req.params.id),
      req.user!.userId,
      req.body.status,
      req.body.decisionNote,
      req.ip,
    );
    res.json(updated);
  }),
);

// Cancel my request
router.patch(
  "/:id/cancel",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await cancelLeaveRequest(
      String(req.params.id),
      req.user!.userId,
      req.ip,
    );
    res.json(updated);
  }),
);

export default router;
