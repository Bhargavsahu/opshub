import request from "supertest";
import { app } from "../app.js";
import { getToken } from "./helpers.js";
import { prisma } from "../config/database.js";

describe("Inventory", () => {
  describe("GET /api/inventory", () => {
    it("lists items for authenticated user", async () => {
      const token = await getToken("EMPLOYEE");
      const res = await request(app)
        .get("/api/inventory")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("filters by search query", async () => {
      const token = await getToken("EMPLOYEE");
      const res = await request(app)
        .get("/api/inventory?search=monitor")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it("rejects unauthenticated request", async () => {
      const res = await request(app).get("/api/inventory");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/inventory", () => {
    it("manager can create an item", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .post("/api/inventory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Test Widget",
          sku: "TST-WIDGET-001",
          quantity: 100,
          unit: "pcs",
          reorderLevel: 10,
          category: "Testing",
        });

      expect(res.status).toBe(201);
      expect(res.body.sku).toBe("TST-WIDGET-001");
    });

    it("rejects duplicate SKU", async () => {
      const token = await getToken("MANAGER");
      const res = await request(app)
        .post("/api/inventory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Duplicate Widget",
          sku: "TST-WIDGET-001",
          quantity: 50,
          unit: "pcs",
          reorderLevel: 5,
          category: "Testing",
        });

      expect(res.status).toBe(409);
    });

    it("employee cannot create items", async () => {
      const token = await getToken("EMPLOYEE");
      const res = await request(app)
        .post("/api/inventory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Blocked Item",
          sku: "BLK-001",
          quantity: 10,
          unit: "pcs",
          reorderLevel: 2,
          category: "Blocked",
        });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/inventory/:id/movements", () => {
    it("records stock IN movement", async () => {
      const token = await getToken("MANAGER");
      const item = await prisma.inventoryItem.findFirst({
        where: { sku: "TST-WIDGET-001" },
      });

      const res = await request(app)
        .post(`/api/inventory/${item!.id}/movements`)
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "IN", quantity: 25, note: "Restock" });

      expect(res.status).toBe(201);
      expect(res.body.item.quantity).toBe(125);
    });

    it("prevents negative stock on OUT", async () => {
      const token = await getToken("MANAGER");
      const item = await prisma.inventoryItem.findFirst({
        where: { sku: "TST-WIDGET-001" },
      });

      const res = await request(app)
        .post(`/api/inventory/${item!.id}/movements`)
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "OUT", quantity: 9999, note: "Too much" });

      expect(res.status).toBe(400);
    });
  });
});
