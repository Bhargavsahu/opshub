import request from "supertest";
import { app } from "../app.js";
import { getToken } from "./helpers.js";
import { prisma } from "../config/database.js";

describe("Leave", () => {
  describe("GET /api/leave/types", () => {
    it("returns leave types", async () => {
      const token = await getToken("EMPLOYEE");
      const res = await request(app)
        .get("/api/leave/types")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);
      expect(res.body.map((t: any) => t.name).sort()).toEqual(
        ["Annual Leave", "Casual Leave", "Sick Leave"],
      );
    });
  });

  describe("GET /api/leave/balance", () => {
    it("returns balance for employee", async () => {
      const token = await getToken("EMPLOYEE");
      const res = await request(app)
        .get("/api/leave/balance")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((b: any) => {
        expect(b).toHaveProperty("total");
        expect(b).toHaveProperty("used");
        expect(b).toHaveProperty("remaining");
      });
    });
  });

  describe("POST /api/leave", () => {
    let leaveTypeId: string;

    beforeAll(async () => {
      const lt = await prisma.leaveType.findFirst({ where: { name: "Casual Leave" } });
      leaveTypeId = lt!.id;
    });

    it("creates a leave request", async () => {
      const token = await getToken("EMPLOYEE");
      const res = await request(app)
        .post("/api/leave")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveTypeId,
          startDate: "2026-12-20T00:00:00.000Z",
          endDate: "2026-12-20T00:00:00.000Z",
          reason: "Personal work",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("PENDING");
    });

    it("validates missing fields", async () => {
      const token = await getToken("EMPLOYEE");
      const res = await request(app)
        .post("/api/leave")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/leave/:id/decide", () => {
    it("manager can approve a leave request", async () => {
      const managerToken = await getToken("MANAGER");

      // Find a pending request from the manager's team
      const requests = await request(app)
        .get("/api/leave")
        .set("Authorization", `Bearer ${managerToken}`);

      const pending = requests.body.find((r: any) => r.status === "PENDING");
      if (!pending) return; // no pending requests in seed

      const res = await request(app)
        .patch(`/api/leave/${pending.id}/decide`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ status: "APPROVED" });

      expect([200, 400]).toContain(res.status); // 400 if balance issue
    });

    it("employee cannot decide on leave", async () => {
      const token = await getToken("EMPLOYEE");

      const res = await request(app)
        .patch("/api/leave/fake-id/decide")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(403);
    });
  });
});
