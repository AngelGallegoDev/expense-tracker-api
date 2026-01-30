import request = require("supertest")
import { app } from "../src/app";

describe("GET /health", () => {
  it("should return 200 and status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
