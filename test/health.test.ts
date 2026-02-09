import request from "supertest"
import { app } from "../src/app";

describe("GET /api/v1/health", () => {
  it("should return 200 and status ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({data: { status: "ok" }});
  });
  it("404 on unknown route returns consistent error shape", async () => {
  const response = await request(app).get("/api/v1/does-not-exist")
  expect(response.status).toBe(404)
  expect(response.body).toHaveProperty("error.code", "NOT_FOUND")
  expect(response.body).toHaveProperty("error.message")
})
});
