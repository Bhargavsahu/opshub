import request from "supertest";
import { app } from "../app.js";
import { getToken } from "./helpers.js";

describe("RBAC", () => {
  it("employee cannot access admin user list fully", async () => {
    const token = await getToken("EMPLOYEE");

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Employee should only see themselves
    expect(res.body.length).toBe(1);
    expect(res.body[0].email).toBe("emp1@opshub.demo");
  });

  it("manager sees own team", async () => {
    const token = await getToken("MANAGER");

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Manager sees self + direct reports
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("admin sees all users", async () => {
    const token = await getToken("ADMIN");

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(9);
  });

  it("employee cannot change user roles", async () => {
    const token = await getToken("EMPLOYEE");

    const res = await request(app)
      .patch("/api/users/fake-id/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "ADMIN" });

    expect(res.status).toBe(403);
  });

  it("employee cannot access low stock alerts", async () => {
    const token = await getToken("EMPLOYEE");

    const res = await request(app)
      .get("/api/inventory/alerts/low-stock")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("manager can access low stock alerts", async () => {
    const token = await getToken("MANAGER");

    const res = await request(app)
      .get("/api/inventory/alerts/low-stock")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
