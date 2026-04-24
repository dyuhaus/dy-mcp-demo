import { afterEach, describe, expect, it, vi } from "vitest";
import { createContext, getHealth } from "../src/lib/api";

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends x-agent header on every request", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, counts: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getHealth();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toMatch(/\/health$/);
    expect(init?.headers).toMatchObject({ "x-agent": "dy-mcp-web" });
  });

  it("does not attach any authorization header (public demo)", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, counts: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getHealth();

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });

  it("throws with status text on non-OK responses", async () => {
    const fetchMock = vi.fn(
      async () => new Response("boom", { status: 404, statusText: "Not Found" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createContext({ type: "idea", title: "x" })).rejects.toThrow(
      /404 Not Found/,
    );
  });
});
