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

describe("Login form", () => {
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

  it("submits email and password to /auth/login", async () => {
    const fetchMock = mockFetch({
      "/auth/login": {
        status: 200,
        body: { id: 1, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", created_at: "2026-06-11T00:00:00Z" },
      },
      "/tasks/list": { status: 200, body: [] },
    });
    vi.stubGlobal("fetch", fetchMock);

    document.querySelector<HTMLInputElement>('#login-form input[name="email"]')!.value = "ada@example.com";
    document.querySelector<HTMLInputElement>('#login-form input[name="password"]')!.value = "super-secret";
    document.querySelector<HTMLFormElement>("#login-form")!.requestSubmit();
    await flushAsync();

    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "ada@example.com", password: "super-secret" }),
      }),
    );
  });

  it("shows the uniform error message when login returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/auth/login": { status: 401, body: { detail: "Invalid email or password" } },
        "/tasks/list": { status: 200, body: [] },
      }),
    );

    document.querySelector<HTMLInputElement>('#login-form input[name="email"]')!.value = "ada@example.com";
    document.querySelector<HTMLInputElement>('#login-form input[name="password"]')!.value = "wrong-password";
    document.querySelector<HTMLFormElement>("#login-form")!.requestSubmit();
    await flushAsync();

    const error = document.querySelector<HTMLElement>("#login-error");
    expect(error?.hidden).toBe(false);
    expect(error?.textContent).toBe("Invalid email or password");
  });
});

describe("Auth form toggle", () => {
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

  it("switches from signup to login when 'Have an account? Log in' is clicked", () => {
    document.querySelector<HTMLButtonElement>("#show-login")!.click();

    expect(document.querySelector<HTMLElement>("#signup-form")!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>("#login-form")!.hidden).toBe(false);
  });

  it("switches from login to signup when 'Need an account? Sign up' is clicked", () => {
    document.querySelector<HTMLButtonElement>("#show-login")!.click();
    document.querySelector<HTMLButtonElement>("#show-signup")!.click();

    expect(document.querySelector<HTMLElement>("#signup-form")!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("#login-form")!.hidden).toBe(true);
  });
});

describe("View routing based on session", () => {
  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("shows the auth view and hides the task view when /auth/me returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/auth/me": { status: 401, body: { detail: "Not authenticated" } },
        "/tasks/list": { status: 200, body: [] },
      }),
    );
    await loadApp();
    await flushAsync();

    expect(document.querySelector<HTMLElement>("#auth-view")!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("#task-view")!.hidden).toBe(true);
  });

  it("returns to the auth view when a task request returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/auth/me": {
          status: 200,
          body: { id: 1, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", created_at: "2026-06-11T00:00:00Z" },
        },
        "/tasks/list": { status: 401, body: { detail: "Not authenticated" } },
      }),
    );
    await loadApp();
    await flushAsync();

    expect(document.querySelector<HTMLElement>("#auth-view")!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("#task-view")!.hidden).toBe(true);
  });

  it("shows the task view and hides the auth view when /auth/me returns the current user", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/auth/me": {
          status: 200,
          body: { id: 1, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", created_at: "2026-06-11T00:00:00Z" },
        },
        "/tasks/list": { status: 200, body: [] },
      }),
    );
    await loadApp();
    await flushAsync();

    expect(document.querySelector<HTMLElement>("#auth-view")!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>("#task-view")!.hidden).toBe(false);
  });

  it("returns to the auth view and calls /auth/logout when the logout button is clicked", async () => {
    const fetchMock = mockFetch({
      "/auth/me": {
        status: 200,
        body: { id: 1, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", created_at: "2026-06-11T00:00:00Z" },
      },
      "/tasks/list": { status: 200, body: [] },
      "/auth/logout": { status: 204, body: null },
    });
    vi.stubGlobal("fetch", fetchMock);
    await loadApp();
    await flushAsync();

    document.querySelector<HTMLButtonElement>("#logout-btn")!.click();
    await flushAsync();

    expect(fetchMock).toHaveBeenCalledWith("/auth/logout", expect.objectContaining({ method: "POST" }));
    expect(document.querySelector<HTMLElement>("#auth-view")!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("#task-view")!.hidden).toBe(true);
  });
});
