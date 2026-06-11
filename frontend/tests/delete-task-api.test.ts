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

type FetchInit = { method?: string; body?: string };

function setupFetch(initialTasks: unknown[], deleteResponse: (url: string, init?: FetchInit) => unknown) {
  return vi.fn((url: string, init?: FetchInit) => {
    if (!init?.method || init.method === "GET") {
      return Promise.resolve(jsonResponse(200, initialTasks));
    }
    if (init.method === "DELETE") {
      return Promise.resolve(deleteResponse(url, init));
    }
    throw new Error(`unexpected fetch call: ${init.method} ${url}`);
  });
}

const TASK_A = {
  id: 1,
  description: "Pay electricity bill",
  priority: "High",
  due_date: "2020-01-01",
  status: "Incomplete",
};

const TASK_B = {
  id: 2,
  description: "Buy groceries",
  priority: "Low",
  due_date: "2999-01-01",
  status: "Incomplete",
};

describe("Delete task (API-backed)", () => {
  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("deleting a task sends DELETE /tasks/<id>/ and removes the row, updating the counter", async () => {
    const fetchMock = setupFetch([TASK_A, TASK_B], () => jsonResponse(204, null));
    vi.stubGlobal("fetch", fetchMock);

    await loadApp();
    await flushAsync();

    const before = getRows().length;
    const row = document.querySelector<HTMLElement>('.task[data-id="1"]')!;
    row.querySelector<HTMLButtonElement>(".icon-btn--delete")!.click();
    await flushAsync();

    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(deleteCall?.[0]).toBe("/tasks/1/");

    expect(getRows().length).toBe(before - 1);
    expect(document.querySelector('.task[data-id="1"]')).toBeNull();
    expect(document.querySelector("#task-counter")?.textContent).toContain(`${before - 1} task`);
  });

  it("shows a dismissible banner and leaves the row when delete fails", async () => {
    const fetchMock = setupFetch([TASK_A, TASK_B], () => jsonResponse(500, { detail: "Internal Server Error" }));
    vi.stubGlobal("fetch", fetchMock);

    await loadApp();
    await flushAsync();

    const before = getRows().length;
    const row = document.querySelector<HTMLElement>('.task[data-id="1"]')!;
    row.querySelector<HTMLButtonElement>(".icon-btn--delete")!.click();
    await flushAsync();

    expect(getRows().length).toBe(before);
    expect(document.querySelector('.task[data-id="1"]')).not.toBeNull();

    const banner = document.querySelector<HTMLElement>("#action-banner");
    expect(banner?.hidden).toBe(false);
    expect(banner?.textContent).toContain("Pay electricity bill");

    banner?.querySelector<HTMLButtonElement>(".banner-dismiss")!.click();
    expect(document.querySelector<HTMLElement>("#action-banner")?.hidden).toBe(true);
  });
});
