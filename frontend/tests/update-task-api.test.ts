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

function setupFetch(initialTasks: unknown[], patchResponse: (url: string, init?: FetchInit) => unknown) {
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

function editAndSave(taskId: number, newDescription: string): void {
  const row = document.querySelector<HTMLElement>(`.task[data-id="${taskId}"]`)!;
  row.querySelector<HTMLButtonElement>(".icon-btn--edit")!.click();

  const editingRow = document.querySelector<HTMLElement>(`.task[data-id="${taskId}"]`)!;
  const input = editingRow.querySelector<HTMLInputElement>(".task-edit-input")!;
  input.value = newDescription;
  editingRow.querySelector<HTMLButtonElement>(".btn-save")!.click();
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

const FUTURE_INCOMPLETE = {
  id: 3,
  description: "Buy groceries",
  priority: "Low",
  due_date: "2999-01-01",
  status: "Incomplete",
};

describe("Update task description (API-backed)", () => {
  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it.fails(
    "saving an edit sends PATCH status and updates an overdue row, keeping it red",
    async () => {
      const fetchMock = setupFetch([OVERDUE_INCOMPLETE], () => jsonResponse(204, null));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      editAndSave(1, "Pay the electricity bill online");
      await flushAsync();

      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(patchCall?.[0]).toBe("/tasks/1/");
      expect(JSON.parse((patchCall?.[1] as FetchInit).body ?? "{}")).toEqual({
        description: "Pay the electricity bill online",
      });

      const updatedRow = document.querySelector<HTMLElement>('.task[data-id="1"]')!;
      expect(updatedRow.querySelector(".task-description")?.textContent).toBe("Pay the electricity bill online");
      expect(updatedRow.classList.contains("task--overdue")).toBe(true);
    },
  );

  it.fails(
    "saving an edit on a complete-and-overdue row keeps it green (completion wins over overdue)",
    async () => {
      const fetchMock = setupFetch([OVERDUE_COMPLETE], () => jsonResponse(204, null));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      editAndSave(2, "Send the invoice to client");
      await flushAsync();

      const updatedRow = document.querySelector<HTMLElement>('.task[data-id="2"]')!;
      expect(updatedRow.querySelector(".task-description")?.textContent).toBe("Send the invoice to client");
      expect(updatedRow.classList.contains("task--complete")).toBe(true);
    },
  );

  it.fails(
    "saving an edit on a not-yet-due incomplete row keeps it blue",
    async () => {
      const fetchMock = setupFetch([FUTURE_INCOMPLETE], () => jsonResponse(204, null));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      editAndSave(3, "Buy groceries for the week");
      await flushAsync();

      const updatedRow = document.querySelector<HTMLElement>('.task[data-id="3"]')!;
      expect(updatedRow.querySelector(".task-description")?.textContent).toBe("Buy groceries for the week");
      expect(updatedRow.classList.contains("task--incomplete")).toBe(true);
    },
  );

  it.fails(
    "shows a dismissible banner and keeps the original description when the update fails",
    async () => {
      const fetchMock = setupFetch([OVERDUE_INCOMPLETE], () => jsonResponse(500, { detail: "Internal Server Error" }));
      vi.stubGlobal("fetch", fetchMock);

      await loadApp();
      await flushAsync();

      editAndSave(1, "This edit should not be saved");
      await flushAsync();

      const updatedRow = document.querySelector<HTMLElement>('.task[data-id="1"]')!;
      expect(updatedRow.querySelector(".task-description")?.textContent).toBe("Pay electricity bill");

      const banner = document.querySelector<HTMLElement>("#action-banner");
      expect(banner?.hidden).toBe(false);
      expect(banner?.textContent).toContain("Pay electricity bill");

      banner?.querySelector<HTMLButtonElement>(".banner-dismiss")!.click();
      expect(document.querySelector<HTMLElement>("#action-banner")?.hidden).toBe(true);
    },
  );
});
