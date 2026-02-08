import { describe, expect, test } from "bun:test";
import { ProcareApiClient } from "./client.js";

type FetchCall = { input: RequestInfo | URL; init?: RequestInit };

function createMockFetch(
  responses: Array<{ status?: number; body: unknown }>,
): { fetchImpl: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    const next = responses.shift();
    if (!next) {
      throw new Error("No mocked response remaining");
    }

    return new Response(JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  return { fetchImpl, calls };
}

describe("ProcareApiClient", () => {
  test("builds kids endpoint with bearer auth", async () => {
    const { fetchImpl, calls } = createMockFetch([
      { body: { kids: [] } },
    ]);
    const client = new ProcareApiClient({
      authToken: "token-123",
      fetchImpl,
      minRequestIntervalMs: 0,
    });

    const response = await client.getKids();

    expect(response.kids).toEqual([]);
    expect(String(calls[0].input)).toBe(
      "https://api-school.procareconnect.com/api/web/parent/kids/",
    );
    expect(calls[0].init?.headers).toEqual({
      accept: "application/json, text/plain, */*",
      authorization: "Bearer token-123",
    });
  });

  test("builds daily activities URL with expected query params", async () => {
    const { fetchImpl, calls } = createMockFetch([
      { body: { page: 2, per_page: 30, daily_activities: [] } },
    ]);

    const client = new ProcareApiClient({
      authToken: "token-123",
      fetchImpl,
      minRequestIntervalMs: 0,
    });

    await client.getDailyActivities({
      kidId: "kid-1",
      dateTo: "2026-02-07",
      page: 2,
    });

    const calledUrl = new URL(String(calls[0].input));
    expect(calledUrl.pathname).toBe("/api/web/parent/daily_activities/");
    expect(calledUrl.searchParams.get("kid_id")).toBe("kid-1");
    expect(calledUrl.searchParams.get("filters[daily_activity][date_to]")).toBe(
      "2026-02-07",
    );
    expect(calledUrl.searchParams.get("page")).toBe("2");
  });

  test("paginates until a short page is returned", async () => {
    const { fetchImpl } = createMockFetch([
      {
        body: {
          page: 1,
          per_page: 2,
          daily_activities: [{ id: "a1" }, { id: "a2" }],
        },
      },
      {
        body: {
          page: 2,
          per_page: 2,
          daily_activities: [{ id: "a3" }],
        },
      },
    ]);

    const client = new ProcareApiClient({
      authToken: "token-123",
      fetchImpl,
      minRequestIntervalMs: 0,
    });

    const activities = await client.getAllDailyActivities("kid-1", "2026-02-07");
    expect(activities).toHaveLength(3);
  });

  test("supports query auth mode", async () => {
    const { fetchImpl, calls } = createMockFetch([
      { body: { kids: [] } },
    ]);

    const client = new ProcareApiClient({
      authToken: "token-xyz",
      authMode: "query",
      fetchImpl,
      minRequestIntervalMs: 0,
    });

    await client.getKids();

    const calledUrl = new URL(String(calls[0].input));
    expect(calledUrl.searchParams.get("auth_token")).toBe("token-xyz");
  });

  test("throws helpful error for unauthorized responses", async () => {
    const { fetchImpl } = createMockFetch([
      { status: 401, body: { error: "unauthorized" } },
    ]);

    const client = new ProcareApiClient({
      authToken: "bad-token",
      fetchImpl,
      minRequestIntervalMs: 0,
    });

    await expect(client.getUser()).rejects.toThrow("(401)");
  });
});
