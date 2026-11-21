import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { logAudit } from "../../middleware/audit.js";

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["REVIEW", "TODO"],
  REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: ["TODO"], // reopen
};

export async function changeTaskStatus(
  taskId: string,
  newStatus: string,
  userId: string,
  ip?: string,
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw AppError.notFound("Task not found");

  const allowed = VALID_TRANSITIONS[task.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw AppError.badRequest(
      `Cannot move from '${task.status}' to '${newStatus}'. Allowed: ${allowed.join(", ")}`,
    );
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus as any },
    include: {
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    userId,
    action: "task.statusChange",
    entity: `Task:${taskId}`,
    diff: { before: { status: task.status }, after: { status: newStatus } },
    ip,
  });

  return updated;
}
