import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithTimeout } from "./providerUtils";

describe("fetchJsonWithTimeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries transient HTTP failures before returning JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("temporary", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJsonWithTimeout("https://example.test/rates")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient HTTP failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("missing", { status: 404 }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJsonWithTimeout("https://example.test/rates")).rejects.toThrow("HTTP 404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
