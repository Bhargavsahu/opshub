import request from "supertest";
import { app } from "../app.js";
import { getToken } from "./helpers.js";

describe("Tasks", () => {
  let taskId: string;

  describe("POST /api/tasks", () => {
    it("creates a task", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Test Task",
          description: "Integration test task",
          priority: "HIGH",
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Test Task");
      expect(res.body.status).toBe("TODO");
      taskId = res.body.id;
    });
  });

  describe("GET /api/tasks", () => {
    it("lists tasks", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("filters by status", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .get("/api/tasks?status=TODO")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.forEach((t: any) => {
        expect(t.status).toBe("TODO");
      });
    });
  });

  describe("PATCH /api/tasks/:id/status", () => {
    it("transitions TODO -> IN_PROGRESS", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("IN_PROGRESS");
    });

    it("transitions IN_PROGRESS -> REVIEW", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "REVIEW" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("REVIEW");
    });

    it("transitions REVIEW -> DONE", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "DONE" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("DONE");
    });

    it("rejects invalid transition DONE -> IN_PROGRESS", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(400);
    });

    it("allows DONE -> TODO (reopen)", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "TODO" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("TODO");
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("creator can delete task", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
