import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const indexHtml = readFileSync(resolve(__dirname, "../index.html"), "utf-8");

async function loadApp() {
  document.documentElement.innerHTML = indexHtml;
  vi.resetModules();
  await import("../src/main");
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function mockFetch(handlers: Record<string, { status: number; body: unknown }>) {
  return vi.fn((url: string) => {
    for (const [path, { status, body }] of Object.entries(handlers)) {
      if (url.startsWith(path)) {
        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          json: async () => body,
        });
      }
    }

    return Promise.resolve({ ok: true, status: 200, json: async () => [] });
  });
}

describe("Signup form", () => {
  beforeEach(async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/tasks/list": { status: 200, body: [] },
      }),
    );
    await loadApp();
  });

  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("submits first name, last name, email, and password to /auth/signup", async () => {
    const fetchMock = mockFetch({
      "/auth/signup": {
        status: 201,
        body: { id: 1, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", created_at: "2026-06-11T00:00:00Z" },
      },
      "/tasks/list": { status: 200, body: [] },
    });
    vi.stubGlobal("fetch", fetchMock);

    document.querySelector<HTMLInputElement>('#signup-form input[name="first_name"]')!.value = "Ada";
    document.querySelector<HTMLInputElement>('#signup-form input[name="last_name"]')!.value = "Lovelace";
    document.querySelector<HTMLInputElement>('#signup-form input[name="email"]')!.value = "ada@example.com";
    document.querySelector<HTMLInputElement>('#signup-form input[name="password"]')!.value = "super-secret";
    document.querySelector<HTMLFormElement>("#signup-form")!.requestSubmit();
    await flushAsync();

    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/signup",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@example.com",
          password: "super-secret",
        }),
      }),
    );
  });

  it("shows the API's error message when signup returns a duplicate-email error", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/auth/signup": { status: 409, body: { detail: "Email already registered" } },
        "/tasks/list": { status: 200, body: [] },
      }),
    );

    document.querySelector<HTMLInputElement>('#signup-form input[name="first_name"]')!.value = "Ada";
    document.querySelector<HTMLInputElement>('#signup-form input[name="last_name"]')!.value = "Lovelace";
    document.querySelector<HTMLInputElement>('#signup-form input[name="email"]')!.value = "ada@example.com";
    document.querySelector<HTMLInputElement>('#signup-form input[name="password"]')!.value = "super-secret";
    document.querySelector<HTMLFormElement>("#signup-form")!.requestSubmit();
    await flushAsync();

    const error = document.querySelector<HTMLElement>("#signup-error");
    expect(error?.hidden).toBe(false);
    expect(error?.textContent).toBe("Email already registered");
  });
});
