const request = require("supertest");
const app = require("./app");

describe("GET /api/health", () => {
  it("should return status ok and a message", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("message");
  });
});
