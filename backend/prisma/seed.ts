import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("demo123", 10);

  // ── Users ──────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: "admin@opshub.demo",
      name: "Priya Sharma",
      role: "ADMIN",
      passwordHash: hash,
      isDemo: true,
      avatarUrl: null,
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      email: "manager1@opshub.demo",
      name: "Rahul Verma",
      role: "MANAGER",
      passwordHash: hash,
      isDemo: true,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: "manager2@opshub.demo",
      name: "Anita Desai",
      role: "MANAGER",
      passwordHash: hash,
      isDemo: true,
    },
  });

  const emp1 = await prisma.user.create({
    data: {
      email: "emp1@opshub.demo",
      name: "Vikram Singh",
      role: "EMPLOYEE",
      managerId: manager1.id,
      passwordHash: hash,
      isDemo: true,
    },
  });

  const emp2 = await prisma.user.create({
    data: {
      email: "emp2@opshub.demo",
      name: "Meera Patel",
      role: "EMPLOYEE",
      managerId: manager1.id,
      passwordHash: hash,
      isDemo: true,
    },
  });

  const emp3 = await prisma.user.create({
    data: {
      email: "emp3@opshub.demo",
      name: "Arjun Nair",
      role: "EMPLOYEE",
      managerId: manager2.id,
      passwordHash: hash,
      isDemo: true,
    },
  });

  const emp4 = await prisma.user.create({
    data: {
      email: "emp4@opshub.demo",
      name: "Kavita Reddy",
      role: "EMPLOYEE",
      managerId: manager2.id,
      passwordHash: hash,
      isDemo: true,
    },
  });

  const emp5 = await prisma.user.create({
    data: {
      email: "emp5@opshub.demo",
      name: "Deepak Kumar",
      role: "EMPLOYEE",
      managerId: manager1.id,
      passwordHash: hash,
      isDemo: true,
    },
  });

  const emp6 = await prisma.user.create({
    data: {
      email: "emp6@opshub.demo",
      name: "Sneha Gupta",
      role: "EMPLOYEE",
      managerId: manager2.id,
      passwordHash: hash,
      isDemo: true,
    },
  });

  // ── Leave Types ────────────────────────────────────────────
  const annual = await prisma.leaveType.create({
    data: { name: "Annual", defaultDays: 20, description: "Paid annual leave" },
  });

  const sick = await prisma.leaveType.create({
    data: { name: "Sick", defaultDays: 10, description: "Sick leave with medical certificate" },
  });

  const casual = await prisma.leaveType.create({
    data: { name: "Casual", defaultDays: 5, description: "Casual / personal leave" },
  });

  // ── Sample Leave Requests ──────────────────────────────────
  await prisma.leaveRequest.createMany({
    data: [
      {
        userId: emp1.id,
        leaveTypeId: annual.id,
        startDate: new Date("2026-12-23"),
        endDate: new Date("2026-12-27"),
        days: 5,
        reason: "Family holiday",
        status: "PENDING",
      },
      {
        userId: emp2.id,
        leaveTypeId: sick.id,
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-02"),
        days: 2,
        reason: "Doctor appointment",
        status: "APPROVED",
        decidedById: manager1.id,
        decidedAt: new Date("2026-11-25"),
      },
      {
        userId: emp3.id,
        leaveTypeId: casual.id,
        startDate: new Date("2026-12-15"),
        endDate: new Date("2026-12-15"),
        days: 1,
        reason: "Personal errand",
        status: "PENDING",
      },
    ],
  });

  // ── Inventory Items ────────────────────────────────────────
  const items = await Promise.all([
    prisma.inventoryItem.create({
      data: { name: "Office Chair", sku: "FRN-001", category: "Furniture", quantity: 45, reorderLevel: 10, unit: "pcs" },
    }),
    prisma.inventoryItem.create({
      data: { name: "Standing Desk", sku: "FRN-002", category: "Furniture", quantity: 8, reorderLevel: 10, unit: "pcs" },
    }),
    prisma.inventoryItem.create({
      data: { name: "A4 Paper (ream)", sku: "SUP-001", category: "Supplies", quantity: 150, reorderLevel: 50, unit: "reams" },
    }),
    prisma.inventoryItem.create({
      data: { name: "Whiteboard Marker", sku: "SUP-002", category: "Supplies", quantity: 5, reorderLevel: 20, unit: "pcs" },
    }),
    prisma.inventoryItem.create({
      data: { name: "Laptop - ThinkPad", sku: "IT-001", category: "IT Equipment", quantity: 12, reorderLevel: 5, unit: "pcs" },
    }),
    prisma.inventoryItem.create({
      data: { name: "Monitor 27\"", sku: "IT-002", category: "IT Equipment", quantity: 3, reorderLevel: 5, unit: "pcs" },
    }),
    prisma.inventoryItem.create({
      data: { name: "USB-C Hub", sku: "IT-003", category: "IT Equipment", quantity: 25, reorderLevel: 10, unit: "pcs" },
    }),
    prisma.inventoryItem.create({
      data: { name: "Hand Sanitizer 500ml", sku: "HYG-001", category: "Hygiene", quantity: 60, reorderLevel: 20, unit: "bottles" },
    }),
    prisma.inventoryItem.create({
      data: { name: "Safety Goggles", sku: "SAF-001", category: "Safety", quantity: 2, reorderLevel: 15, unit: "pcs" },
    }),
    prisma.inventoryItem.create({
      data: { name: "Lab Gloves (box)", sku: "SAF-002", category: "Safety", quantity: 30, reorderLevel: 10, unit: "boxes" },
    }),
  ]);

  // Sample stock movements
  await prisma.stockMovement.createMany({
    data: [
      { itemId: items[0].id, type: "IN", quantity: 50, note: "Initial stock" },
      { itemId: items[0].id, type: "OUT", quantity: 5, note: "Issued to new hires" },
      { itemId: items[3].id, type: "IN", quantity: 50, note: "Monthly order" },
      { itemId: items[3].id, type: "OUT", quantity: 45, note: "Distributed to floors" },
      { itemId: items[8].id, type: "OUT", quantity: 13, note: "Lab distribution" },
    ],
  });

  // ── Tasks ──────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      {
        title: "Set up CI/CD pipeline",
        description: "Configure GitHub Actions for automated testing and deployment",
        status: "DONE",
        priority: "HIGH",
        createdById: admin.id,
        assigneeId: emp1.id,
      },
      {
        title: "Design inventory module UI",
        status: "REVIEW",
        priority: "HIGH",
        createdById: manager1.id,
        assigneeId: emp2.id,
      },
      {
        title: "Write API tests for leave module",
        description: "Cover all status transitions and balance checks",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        createdById: manager1.id,
        assigneeId: emp1.id,
        dueDate: new Date("2026-12-05"),
      },
      {
        title: "Update employee handbook",
        status: "TODO",
        priority: "LOW",
        createdById: manager2.id,
        assigneeId: emp3.id,
      },
      {
        title: "Fix dashboard chart alignment",
        status: "TODO",
        priority: "MEDIUM",
        createdById: emp2.id,
        assigneeId: emp2.id,
      },
      {
        title: "Order new safety equipment",
        description: "Safety goggles and lab coats running low",
        status: "TODO",
        priority: "URGENT",
        createdById: manager2.id,
        assigneeId: emp4.id,
      },
      {
        title: "Prepare monthly inventory report",
        status: "TODO",
        priority: "MEDIUM",
        createdById: admin.id,
        assigneeId: emp5.id,
        dueDate: new Date("2026-12-01"),
      },
      {
        title: "Onboard new team members",
        status: "IN_PROGRESS",
        priority: "HIGH",
        createdById: admin.id,
        assigneeId: manager1.id,
      },
    ],
  });

  // ── Chat Channels ──────────────────────────────────────────
  const general = await prisma.chatChannel.create({
    data: { name: "General" },
  });

  await prisma.chatChannel.create({ data: { name: "Engineering" } });
  await prisma.chatChannel.create({ data: { name: "Random" } });

  await prisma.chatMessage.createMany({
    data: [
      { content: "Welcome to OpsHub! 🎉", userId: admin.id, channelId: general.id },
      { content: "Hey everyone, the new inventory module is live.", userId: manager1.id, channelId: general.id },
      { content: "Great work team!", userId: emp1.id, channelId: general.id },
      { content: "Reminder: please submit your leave requests for the holidays early.", userId: manager2.id, channelId: general.id },
    ],
  });

  console.log("✅ Seed complete!");
  console.log(`   ${9} users, ${3} leave types, ${items.length} inventory items, 8 tasks, 3 channels`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
