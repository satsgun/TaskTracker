import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const indexHtml = readFileSync(resolve(__dirname, "../index.html"), "utf-8");

async function loadApp() {
  document.documentElement.innerHTML = indexHtml;
  vi.resetModules();
  await import("../src/main");
}

function getRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".task"));
}

function mockFetchResponse(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Add task (API-backed)", () => {
  beforeEach(async () => {
    await loadApp();
  });

  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("submits the new task to POST /tasks/", async () => {
    const fetchMock = mockFetchResponse(201, {
      id: 101,
      description: "New task",
      priority: "Medium",
      due_date: null,
      status: "Incomplete",
      created_at: "2026-06-11T00:00:00Z",
    });
    vi.stubGlobal("fetch", fetchMock);

    document.querySelector<HTMLInputElement>('input[name="description"]')!.value = "New task";
    document.querySelector<HTMLFormElement>("#add-task-form")!.requestSubmit();
    await flushAsync();

    expect(fetchMock).toHaveBeenCalledWith(
      "/tasks/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ description: "New task", priority: "Medium", due_date: null }),
      }),
    );
  });

  it("adds the task returned by the API to the list", async () => {
    const fetchMock = mockFetchResponse(201, {
      id: 101,
      description: "New task from API",
      priority: "Medium",
      due_date: null,
      status: "Incomplete",
      created_at: "2026-06-11T00:00:00Z",
    });
    vi.stubGlobal("fetch", fetchMock);
    const before = getRows().length;

    document.querySelector<HTMLInputElement>('input[name="description"]')!.value = "New task from API";
    document.querySelector<HTMLFormElement>("#add-task-form")!.requestSubmit();
    await flushAsync();

    expect(getRows().length).toBe(before + 1);
    const newRow = getRows().find((row) => row.dataset.id === "101");
    expect(newRow?.textContent).toContain("New task from API");
  });

  it("calls the API and resets the form after a successful add", async () => {
    const fetchMock = mockFetchResponse(201, {
      id: 102,
      description: "Another task",
      priority: "Medium",
      due_date: null,
      status: "Incomplete",
      created_at: "2026-06-11T00:00:00Z",
    });
    vi.stubGlobal("fetch", fetchMock);
    const input = document.querySelector<HTMLInputElement>('input[name="description"]')!;
    input.value = "Another task";

    document.querySelector<HTMLFormElement>("#add-task-form")!.requestSubmit();
    await flushAsync();

    expect(fetchMock).toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("shows the API's error message and retains input on a 422 response", async () => {
    const fetchMock = mockFetchResponse(422, { detail: "That description is already in use." });
    vi.stubGlobal("fetch", fetchMock);
    const before = getRows().length;
    const input = document.querySelector<HTMLInputElement>('input[name="description"]')!;
    input.value = "Buy milk";

    document.querySelector<HTMLFormElement>("#add-task-form")!.requestSubmit();
    await flushAsync();

    const error = document.querySelector<HTMLElement>("#description-error");
    expect(error?.hidden).toBe(false);
    expect(error?.textContent).toBe("That description is already in use.");
    expect(input.value).toBe("Buy milk");
    expect(getRows().length).toBe(before);
  });

  it("shows and then clears the API's error message on the next keystroke", async () => {
    const fetchMock = mockFetchResponse(422, { detail: "That description is already in use." });
    vi.stubGlobal("fetch", fetchMock);
    const input = document.querySelector<HTMLInputElement>('input[name="description"]')!;
    input.value = "Buy milk";
    document.querySelector<HTMLFormElement>("#add-task-form")!.requestSubmit();
    await flushAsync();

    const error = document.querySelector<HTMLElement>("#description-error");
    expect(error?.textContent).toBe("That description is already in use.");

    input.value = "Buy oat milk";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(error?.hidden).toBe(true);
  });
});
