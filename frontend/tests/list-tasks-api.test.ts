import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const indexHtml = readFileSync(resolve(__dirname, "../index.html"), "utf-8");

async function loadApp() {
  document.documentElement.innerHTML = indexHtml;
  vi.resetModules();
  await import("../src/main");
}

function getRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".task"));
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function lastFetchUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  const calls = fetchMock.mock.calls;
  return new URL(calls[calls.length - 1][0] as string, "http://localhost");
}

const AUTHENTICATED_USER = {
  id: 1,
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  created_at: "2026-06-11T00:00:00Z",
};

function mockFetch(handlers: Record<string, () => Promise<unknown>>) {
  return vi.fn((url: string) => {
    for (const [path, handler] of Object.entries(handlers)) {
      if (url.startsWith(path)) {
        return handler();
      }
    }

    return Promise.resolve(jsonResponse(200, AUTHENTICATED_USER));
  });
}

const SAMPLE_TASKS = [
  { id: 1, description: "Pay electricity bill", priority: "High", due_date: "2020-01-01", status: "Incomplete" },
  { id: 2, description: "Send invoice", priority: "Medium", due_date: "2020-01-01", status: "Complete" },
  { id: 3, description: "Buy groceries", priority: "Low", due_date: "2999-01-01", status: "Incomplete" },
];

describe("List tasks (API-backed)", () => {
  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("fetches tasks from GET /tasks/list on load and renders them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, SAMPLE_TASKS));
    vi.stubGlobal("fetch", fetchMock);

    await loadApp();
    await flushAsync();

    expect(lastFetchUrl(fetchMock).pathname).toBe("/tasks/list");
    expect(getRows().length).toBe(SAMPLE_TASKS.length);
  });

  it(
    "applies output-formatting colors: overdue=red, complete wins over overdue=green, incomplete-not-overdue=blue",
    async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, SAMPLE_TASKS));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      const overdueIncomplete = document.querySelector('.task[data-id="1"]');
      const completeAndOverdue = document.querySelector('.task[data-id="2"]');
      const incompleteNotOverdue = document.querySelector('.task[data-id="3"]');

      expect(overdueIncomplete?.classList.contains("task--overdue")).toBe(true);
      expect(completeAndOverdue?.classList.contains("task--complete")).toBe(true);
      expect(incompleteNotOverdue?.classList.contains("task--incomplete")).toBe(true);
    },
  );

  it("shows a first-run empty state when GET /tasks/list returns no tasks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await loadApp();
    await flushAsync();

    expect(document.querySelector<HTMLElement>("#empty-state")?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>(".filter-bar")?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>(".legend")?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>(".add-task")?.hidden).toBe(false);
  });

  it("shows a no-matches empty state when a search returns no results, keeping filters visible", async () => {
    let listCalls = 0;
    const fetchMock = mockFetch({
      "/tasks/list": () => {
        listCalls += 1;
        return Promise.resolve(jsonResponse(200, listCalls === 1 ? SAMPLE_TASKS : []));
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await loadApp();
    await flushAsync();

    const search = document.querySelector<HTMLInputElement>('input[name="q"]')!;
    search.value = "groceries zzz";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await flushAsync();

    const url = lastFetchUrl(fetchMock);
    expect(url.pathname).toBe("/tasks/list");
    expect(url.searchParams.get("q")).toBe("groceries zzz");

    expect(document.querySelector<HTMLElement>("#empty-state")?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("#empty-state")?.textContent).toContain("groceries zzz");
    expect(document.querySelector<HTMLElement>(".filter-bar")?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>(".legend")?.hidden).toBe(false);
    expect(document.querySelector("#task-counter")?.textContent).toContain(`${SAMPLE_TASKS.length} task`);
    expect(document.querySelector<HTMLButtonElement>("#clear-search-btn")).toBeTruthy();
  });

  it("shows a retry panel when the initial load fails with an HTTP error", async () => {
    const fetchMock = mockFetch({
      "/tasks/list": () => Promise.resolve(jsonResponse(500, { detail: "Internal Server Error" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await loadApp();
    await flushAsync();

    expect(document.querySelector<HTMLElement>("#error-state")?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>(".add-task")?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>(".filter-bar")?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>("#task-list")?.hidden).toBe(true);
    expect(document.querySelector<HTMLButtonElement>("#retry-btn")).toBeTruthy();
  });

  it("shows a retry panel on a network error and recovers when retry succeeds", async () => {
    let listCalls = 0;
    const fetchMock = mockFetch({
      "/tasks/list": () => {
        listCalls += 1;
        if (listCalls === 1) {
          return Promise.reject(new TypeError("Failed to fetch"));
        }
        return Promise.resolve(jsonResponse(200, SAMPLE_TASKS));
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await loadApp();
    await flushAsync();

    expect(document.querySelector<HTMLElement>("#error-state")?.hidden).toBe(false);

    document.querySelector<HTMLButtonElement>("#retry-btn")!.click();
    await flushAsync();

    expect(document.querySelector<HTMLElement>("#error-state")?.hidden).toBe(true);
    expect(getRows().length).toBe(SAMPLE_TASKS.length);
  });
});
