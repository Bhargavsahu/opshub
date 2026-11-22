import { prisma } from "../config/database.js";
import { signAccessToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";

const emailMap: Record<string, string> = {
  ADMIN: "admin@opshub.demo",
  MANAGER: "manager1@opshub.demo",
  EMPLOYEE: "emp1@opshub.demo",
};

export async function getToken(role: "ADMIN" | "MANAGER" | "EMPLOYEE") {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: emailMap[role] },
  });
  return signAccessToken({ userId: user.id, role: user.role, email: user.email });
}

export async function seedTestDb() {
  // Clean in dependency order
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

  const admin = await prisma.user.create({
    data: { email: "admin@opshub.demo", name: "Priya Sharma", role: "ADMIN", passwordHash: hash, isDemo: true },
  });

  const manager1 = await prisma.user.create({
    data: { email: "manager1@opshub.demo", name: "Rahul Verma", role: "MANAGER", passwordHash: hash, isDemo: true },
  });

  await prisma.user.create({
    data: { email: "manager2@opshub.demo", name: "Anita Desai", role: "MANAGER", passwordHash: hash, isDemo: true },
  });

  const emp1 = await prisma.user.create({
    data: { email: "emp1@opshub.demo", name: "Vikram Singh", role: "EMPLOYEE", managerId: manager1.id, passwordHash: hash, isDemo: true },
  });
  await prisma.user.create({
    data: { email: "emp2@opshub.demo", name: "Meera Patel", role: "EMPLOYEE", managerId: manager1.id, passwordHash: hash, isDemo: true },
  });
  await prisma.user.create({
    data: { email: "emp3@opshub.demo", name: "Arjun Nair", role: "EMPLOYEE", managerId: manager1.id, passwordHash: hash, isDemo: true },
  });
  // 3 more employees under manager2 to reach 9 total
  await prisma.user.createMany({
    data: [
      { email: "emp4@opshub.demo", name: "Sneha Reddy", role: "EMPLOYEE", passwordHash: hash, isDemo: true },
      { email: "emp5@opshub.demo", name: "Karan Joshi", role: "EMPLOYEE", passwordHash: hash, isDemo: true },
      { email: "emp6@opshub.demo", name: "Divya Kapoor", role: "EMPLOYEE", passwordHash: hash, isDemo: true },
    ],
  });

  // Leave types
  const annual = await prisma.leaveType.create({ data: { name: "Annual Leave", defaultDays: 20 } });
  await prisma.leaveType.create({ data: { name: "Sick Leave", defaultDays: 10 } });
  await prisma.leaveType.create({ data: { name: "Casual Leave", defaultDays: 5 } });

  // A leave request from emp1
  await prisma.leaveRequest.create({
    data: {
      userId: emp1.id,
      leaveTypeId: annual.id,
      startDate: new Date("2026-12-01"),
      endDate: new Date("2026-12-03"),
      days: 3,
      reason: "Family trip",
      status: "PENDING",
    },
  });

  // Inventory
  await prisma.inventoryItem.createMany({
    data: [
      { name: "Monitor 24\"", sku: "MON-24-001", quantity: 50, unit: "pcs", reorderLevel: 10, category: "Electronics" },
      { name: "Keyboard", sku: "KEY-001", quantity: 100, unit: "pcs", reorderLevel: 20, category: "Electronics" },
      { name: "A4 Paper Ream", sku: "PAP-A4-001", quantity: 5, unit: "reams", reorderLevel: 10, category: "Stationery" },
    ],
  });

  // Tasks
  await prisma.task.create({
    data: { title: "Setup CI pipeline", status: "TODO", priority: "HIGH", createdById: admin.id, assigneeId: emp1.id },
  });

  // Chat channel
  await prisma.chatChannel.create({ data: { name: "General" } });
}
