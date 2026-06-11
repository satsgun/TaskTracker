import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const indexHtml = readFileSync(resolve(__dirname, "../index.html"), "utf-8");

async function loadApp() {
  document.documentElement.innerHTML = indexHtml;
  vi.resetModules();
  await import("../src/main");
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

type FetchInit = { method?: string; body?: string };

function setupFetch(
  initialTasks: unknown[],
  patchResponse: (url: string, init?: FetchInit) => unknown,
) {
  return vi.fn((url: string, init?: FetchInit) => {
    if (!init?.method || init.method === "GET") {
      return Promise.resolve(jsonResponse(200, initialTasks));
    }
    if (init.method === "PATCH") {
      return Promise.resolve(patchResponse(url, init));
    }
    throw new Error(`unexpected fetch call: ${init.method} ${url}`);
  });
}

const OVERDUE_INCOMPLETE = {
  id: 1,
  description: "Pay electricity bill",
  priority: "High",
  due_date: "2020-01-01",
  status: "Incomplete",
};

const OVERDUE_COMPLETE = {
  id: 2,
  description: "Send invoice",
  priority: "Medium",
  due_date: "2020-01-01",
  status: "Complete",
};

const FUTURE_COMPLETE = {
  id: 3,
  description: "Plan vacation",
  priority: "Low",
  due_date: "2999-01-01",
  status: "Complete",
};

describe("Mark as complete (API-backed)", () => {
  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it.fails(
    "completing an overdue task sends PATCH status=Complete and recolors the row green",
    async () => {
      const fetchMock = setupFetch([OVERDUE_INCOMPLETE], () => jsonResponse(204, null));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      const row = document.querySelector<HTMLElement>('.task[data-id="1"]')!;
      expect(row.classList.contains("task--overdue")).toBe(true);

      row.querySelector<HTMLButtonElement>(".icon-btn--complete")!.click();
      await flushAsync();

      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(patchCall?.[0]).toBe("/tasks/1/");
      expect(JSON.parse((patchCall?.[1] as FetchInit).body ?? "{}")).toEqual({ status: "Complete" });

      const updatedRow = document.querySelector<HTMLElement>('.task[data-id="1"]')!;
      expect(updatedRow.classList.contains("task--complete")).toBe(true);
      expect(updatedRow.classList.contains("task--overdue")).toBe(false);
    },
  );

  it.fails(
    "un-completing an overdue task sends PATCH status=Incomplete and recolors the row red",
    async () => {
      const fetchMock = setupFetch([OVERDUE_COMPLETE], () => jsonResponse(204, null));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      const row = document.querySelector<HTMLElement>('.task[data-id="2"]')!;
      expect(row.classList.contains("task--complete")).toBe(true);

      row.querySelector<HTMLButtonElement>(".icon-btn--complete")!.click();
      await flushAsync();

      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(patchCall?.[0]).toBe("/tasks/2/");
      expect(JSON.parse((patchCall?.[1] as FetchInit).body ?? "{}")).toEqual({ status: "Incomplete" });

      const updatedRow = document.querySelector<HTMLElement>('.task[data-id="2"]')!;
      expect(updatedRow.classList.contains("task--overdue")).toBe(true);
    },
  );

  it.fails(
    "un-completing a not-yet-due task sends PATCH status=Incomplete and recolors the row blue",
    async () => {
      const fetchMock = setupFetch([FUTURE_COMPLETE], () => jsonResponse(204, null));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      const row = document.querySelector<HTMLElement>('.task[data-id="3"]')!;
      row.querySelector<HTMLButtonElement>(".icon-btn--complete")!.click();
      await flushAsync();

      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(patchCall?.[0]).toBe("/tasks/3/");
      expect(JSON.parse((patchCall?.[1] as FetchInit).body ?? "{}")).toEqual({ status: "Incomplete" });

      const updatedRow = document.querySelector<HTMLElement>('.task[data-id="3"]')!;
      expect(updatedRow.classList.contains("task--incomplete")).toBe(true);
    },
  );

  it.fails(
    "shows a dismissible banner and leaves the row unchanged when marking complete fails",
    async () => {
      const fetchMock = setupFetch([OVERDUE_INCOMPLETE], () => jsonResponse(500, { detail: "Internal Server Error" }));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      const row = document.querySelector<HTMLElement>('.task[data-id="1"]')!;
      row.querySelector<HTMLButtonElement>(".icon-btn--complete")!.click();
      await flushAsync();

      const updatedRow = document.querySelector<HTMLElement>('.task[data-id="1"]')!;
      expect(updatedRow.classList.contains("task--overdue")).toBe(true);
      expect(updatedRow.querySelector<HTMLButtonElement>(".icon-btn--complete")?.getAttribute("aria-label")).toBe(
        "Mark complete",
      );

      const banner = document.querySelector<HTMLElement>("#action-banner");
      expect(banner?.hidden).toBe(false);
      expect(banner?.textContent).toContain("Pay electricity bill");

      banner?.querySelector<HTMLButtonElement>(".banner-dismiss")!.click();
      expect(document.querySelector<HTMLElement>("#action-banner")?.hidden).toBe(true);
    },
  );
});
