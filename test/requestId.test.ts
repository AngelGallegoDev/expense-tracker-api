import request from "supertest";
import { app } from "../src/app";
import { pool } from "../src/db";

describe("requestId", () => {
  let cleanupEmail: string | null = null;

  afterEach(async () => {
    if (!cleanupEmail) return;

    await pool.query("DELETE FROM users WHERE email = $1", [cleanupEmail]);
    cleanupEmail = null;
  });
  it("adds x-request-id header and includes requestId in 404 error body", async () => {
    const res = await request(app).get("/api/v1/__nope__");

    expect(res.status).toBe(404);
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body?.error?.requestId).toBe(res.headers["x-request-id"]);
  });
  it("401 no token", async () => {
    const res = await request(app).get("/api/v1/users/me")
    expect(res.status).toBe(401)
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body?.error?.requestId).toBe(res.headers["x-request-id"]);

  })
  it("403 includes requestId when role is insufficient", async () => {
    const email = "prueba@test.com";
    const password = "password123";

    await request(app).post("/api/v1/auth/register").send({
      email,
      password,
    });

    const login = await request(app).post("/api/v1/auth/login").send({
      email,
      password,
    });

    const token = login.body?.data?.token;
    expect(token).toBeDefined();

    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body?.error?.requestId).toBe(res.headers["x-request-id"]);


  });
});
