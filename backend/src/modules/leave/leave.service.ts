import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { logAudit } from "../../middleware/audit.js";
import { CreateLeaveInput } from "./leave.schema.js";

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1;
}

export async function getLeaveBalance(userId: string) {
  const leaveTypes = await prisma.leaveType.findMany();
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
  const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

  const approved = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: "APPROVED",
      startDate: { gte: startOfYear },
      endDate: { lte: endOfYear },
    },
    select: { leaveTypeId: true, days: true },
  });

  return leaveTypes.map((lt) => {
    const used = approved
      .filter((r) => r.leaveTypeId === lt.id)
      .reduce((sum, r) => sum + r.days, 0);
    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      total: lt.defaultDays,
      used,
      remaining: lt.defaultDays - used,
    };
  });
}

export async function createLeaveRequest(
  userId: string,
  input: CreateLeaveInput,
  ip?: string,
) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  if (endDate < startDate) {
    throw AppError.badRequest("End date must be after start date");
  }
  if (startDate < new Date()) {
    throw AppError.badRequest("Start date must be in the future");
  }

  const days = daysBetween(startDate, endDate);

  // Check balance
  const balance = await getLeaveBalance(userId);
  const typeBalance = balance.find((b) => b.leaveTypeId === input.leaveTypeId);
  if (!typeBalance) {
    throw AppError.badRequest("Invalid leave type");
  }
  if (typeBalance.remaining < days) {
    throw AppError.badRequest(
      `Insufficient balance: ${typeBalance.remaining} days remaining, requested ${days}`,
    );
  }

  // Check overlapping approved leave
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: "APPROVED",
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  if (overlap) {
    throw AppError.conflict("Overlapping approved leave exists");
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId,
      leaveTypeId: input.leaveTypeId,
      startDate,
      endDate,
      days,
      reason: input.reason,
    },
    include: { leaveType: true, user: { select: { name: true, email: true } } },
  });

  await logAudit({
    userId,
    action: "leave.create",
    entity: `LeaveRequest:${request.id}`,
    diff: { status: "PENDING", days, leaveType: request.leaveType.name },
    ip,
  });

  return request;
}

export async function decideLeaveRequest(
  requestId: string,
  deciderId: string,
  status: "APPROVED" | "REJECTED",
  decisionNote?: string,
  ip?: string,
) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });

  if (!request) throw AppError.notFound("Leave request not found");
  if (request.status !== "PENDING") {
    throw AppError.badRequest("Can only decide on pending requests");
  }

  // Manager can only decide for their direct reports
  const decider = await prisma.user.findUnique({ where: { id: deciderId } });
  if (!decider) throw AppError.notFound("Decider not found");

  if (decider.role === "MANAGER" && request.user.managerId !== deciderId) {
    throw AppError.forbidden("You can only decide for your direct reports");
  }

  // If approving, re-check balance
  if (status === "APPROVED") {
    const balance = await getLeaveBalance(request.userId);
    const typeBalance = balance.find(
      (b) => b.leaveTypeId === request.leaveTypeId,
    );
    if (typeBalance && typeBalance.remaining < request.days) {
      throw AppError.badRequest("Insufficient leave balance to approve");
    }
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: requestId },
    data: {
      status,
      decidedById: deciderId,
      decisionNote,
      decidedAt: new Date(),
    },
    include: { leaveType: true, user: { select: { name: true, email: true } } },
  });

  await logAudit({
    userId: deciderId,
    action: `leave.${status.toLowerCase()}`,
    entity: `LeaveRequest:${requestId}`,
    diff: { before: { status: "PENDING" }, after: { status } },
    ip,
  });

  return updated;
}

export async function cancelLeaveRequest(
  requestId: string,
  userId: string,
  ip?: string,
) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw AppError.notFound("Leave request not found");
  if (request.userId !== userId) {
    throw AppError.forbidden("You can only cancel your own requests");
  }
  if (request.status !== "PENDING") {
    throw AppError.badRequest("Can only cancel pending requests");
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    userId,
    action: "leave.cancel",
    entity: `LeaveRequest:${requestId}`,
    ip,
  });

  return updated;
}
