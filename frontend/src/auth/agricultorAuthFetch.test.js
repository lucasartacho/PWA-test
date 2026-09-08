import { db } from "../db.js";
import { agricultorAuthFetch } from "./agricultorAuthFetch.js";

describe("agricultorAuthFetch", () => {
  beforeEach(async () => {
    await db.agricultorSession.put({ id: "current", token: "abc-token" });
  });

  afterEach(async () => {
    await db.agricultorSession.clear();
    vi.restoreAllMocks();
  });

  it("attaches the token and returns the response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await agricultorAuthFetch("/api/agricultor/me/");

    expect(response.status).toBe(200);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer abc-token");
  });

  it("throws when there is no session", async () => {
    await db.agricultorSession.clear();
    await expect(agricultorAuthFetch("/api/agricultor/me/")).rejects.toThrow("Não autenticado");
  });
});
