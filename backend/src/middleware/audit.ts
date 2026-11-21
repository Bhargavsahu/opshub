import { prisma } from "../config/database.js";

interface AuditEntry {
  userId: string;
  action: string;
  entity?: string;
  diff?: Record<string, unknown>;
  ip?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        diff: entry.diff as any,
        ip: entry.ip,
      },
    });
  } catch (err) {
    // Audit logging should never crash the request
    console.error("Audit log failed:", err);
  }
}
