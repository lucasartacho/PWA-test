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

  it("deletes the session and throws when the token is expired (401)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(agricultorAuthFetch("/api/agricultor/me/")).rejects.toThrow("Sessão expirada");

    const session = await db.agricultorSession.get("current");
    expect(session).toBeUndefined();
  });
});
