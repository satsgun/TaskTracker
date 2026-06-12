import { afterEach, describe, expect, it, vi } from "vitest";

function mockFetchResponse(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("signup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts first name, last name, email, and password to /auth/signup with same-origin credentials", async () => {
    const fetchMock = mockFetchResponse(201, {
      id: 1,
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      created_at: "2026-06-11T00:00:00Z",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { signup } = await import("../src/auth");
    const result = await signup("Ada", "Lovelace", "ada@example.com", "super-secret");

    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/signup",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@example.com",
          password: "super-secret",
        }),
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("returns ok:false with the API's error message on a 409 duplicate email", async () => {
    vi.stubGlobal("fetch", mockFetchResponse(409, { detail: "Email already registered" }));

    const { signup } = await import("../src/auth");
    const result = await signup("Ada", "Lovelace", "ada@example.com", "super-secret");

    expect(result).toEqual({ ok: false, error: "Email already registered" });
  });
});
