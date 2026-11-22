import request from "supertest";
import { app } from "../app.js";
import { getToken } from "./helpers.js";

describe("Dashboard", () => {
  it("returns summary for admin", async () => {
    const token = await getToken("ADMIN");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalUsers");
    expect(res.body).toHaveProperty("pendingLeaves");
    expect(res.body).toHaveProperty("tasksByStatus");
    expect(res.body).toHaveProperty("totalItems");
    expect(res.body).toHaveProperty("lowStockCount");
  });

  it("returns activity log", async () => {
    const token = await getToken("ADMIN");
    const res = await request(app)
      .get("/api/dashboard/activity")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/api/dashboard/summary");
    expect(res.status).toBe(401);
  });
});
