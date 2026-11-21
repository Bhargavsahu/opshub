import { SchemaType } from "@google/generative-ai";
import { prisma } from "../../config/database.js";
import { getLeaveBalance } from "../leave/leave.service.js";
import { getLowStockItems } from "../inventory/inventory.service.js";

// Tool definitions for Gemini function calling
export const toolDefinitions = [
  {
    name: "get_my_leave_balance",
    description:
      "Get the authenticated user's leave balance for the current year, broken down by leave type (Annual, Sick, Casual). Shows total, used, and remaining days.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "list_my_tasks",
    description:
      "List tasks assigned to the authenticated user. Can filter by status (TODO, IN_PROGRESS, REVIEW, DONE).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          enum: ["TODO", "IN_PROGRESS", "REVIEW", "DONE"],
          description: "Optional status filter",
        },
      },
    },
  },
  {
    name: "search_inventory",
    description:
      "Search inventory items by name, SKU, or category. Returns item name, SKU, quantity, and reorder level.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Search term for name, SKU or category",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_low_stock_items",
    description:
      "List inventory items that are at or below their reorder level. Only available to managers and admins.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_pending_approvals",
    description:
      "Get leave requests pending the authenticated manager's or admin's approval. Shows requester name, dates, leave type, and reason.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

// Tool execution (role-checked)
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  role: string,
): Promise<unknown> {
  switch (toolName) {
    case "get_my_leave_balance":
      return getLeaveBalance(userId);

    case "list_my_tasks": {
      const where: any = {
        OR: [{ assigneeId: userId }, { createdById: userId }],
      };
      if (args.status) where.status = args.status;

      return prisma.task.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    case "search_inventory": {
      const query = String(args.query || "").trim();
      if (!query) return [];
      return prisma.inventoryItem.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          name: true,
          sku: true,
          quantity: true,
          unit: true,
          reorderLevel: true,
          category: true,
        },
        take: 10,
      });
    }

    case "list_low_stock_items": {
      if (role === "EMPLOYEE") {
        return { error: "This tool is only available to managers and admins" };
      }
      return getLowStockItems();
    }

    case "get_pending_approvals": {
      if (role === "EMPLOYEE") {
        return {
          error: "This tool is only available to managers and admins",
        };
      }

      let where: any = { status: "PENDING" };
      if (role === "MANAGER") {
        where.user = { managerId: userId };
      }

      return prisma.leaveRequest.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          leaveType: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
