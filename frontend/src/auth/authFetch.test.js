import { db } from "../db.js";
import { authFetch } from "./authFetch.js";

describe("authFetch", () => {
  beforeEach(async () => {
    await db.session.put({ id: "current", access: "old-token", refresh: "refresh-token" });
  });

  afterEach(async () => {
    await db.session.clear();
    vi.restoreAllMocks();
  });

  it("attaches the access token and returns the response on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await authFetch("/api/organizacoes/me/");

    expect(response.status).toBe(200);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer old-token");
  });

  it("refreshes the token and retries once on a 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access: "new-token" }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await authFetch("/api/organizacoes/me/");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const stored = await db.session.get("current");
    expect(stored.access).toBe("new-token");
  });
});
