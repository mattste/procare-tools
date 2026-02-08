import { describe, expect, test } from "bun:test";
import { authenticateProcare } from "./auth.js";

function mockFetch(
  status: number,
  body: unknown,
): typeof fetch {
  return (async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("authenticateProcare", () => {
  test("returns auth token from successful login payload", async () => {
    const response = await authenticateProcare({
      email: "parent@example.com",
      password: "secret",
      fetchImpl: mockFetch(200, { user: { auth_token: "online_auth_abc" } }),
    });

    expect(response.authToken).toBe("online_auth_abc");
  });

  test("throws for invalid credentials", async () => {
    await expect(
      authenticateProcare({
        email: "parent@example.com",
        password: "bad",
        fetchImpl: mockFetch(401, { error: "Unauthorized" }),
      }),
    ).rejects.toThrow("(401)");
  });
});
