import { z } from "zod";

export const createLeaveSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

export const decideLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().max(500).optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;
