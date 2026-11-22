import request from "supertest";
import { app } from "../app.js";
import { getToken } from "./helpers.js";

describe("Auth", () => {
  describe("POST /api/auth/demo", () => {
    it("logs in with a demo user", async () => {
      const res = await request(app)
        .post("/api/auth/demo")
        .send({ email: "admin@opshub.demo" });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe("admin@opshub.demo");
      expect(res.body.user.role).toBe("ADMIN");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("rejects non-demo email", async () => {
      const res = await request(app)
        .post("/api/auth/demo")
        .send({ email: "random@example.com" });

      expect(res.status).toBe(401);
    });

    it("validates request body", async () => {
      const res = await request(app)
        .post("/api/auth/demo")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("refreshes token from cookie", async () => {
      const login = await request(app)
        .post("/api/auth/demo")
        .send({ email: "admin@opshub.demo" });

      const cookie = login.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it("rejects without cookie", async () => {
      const res = await request(app).post("/api/auth/refresh");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns current user with valid token", async () => {
      const token = await getToken("ADMIN");

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("admin@opshub.demo");
      expect(res.body.user.role).toBe("ADMIN");
    });

    it("rejects without token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("rejects with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears refresh cookie", async () => {
      const login = await request(app)
        .post("/api/auth/demo")
        .send({ email: "admin@opshub.demo" });

      const token = login.body.accessToken;
      const cookie = login.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
    });
  });
});
