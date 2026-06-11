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

describe("Task Tracker UI interactions", () => {
  beforeEach(async () => {
    await loadApp();
  });

  afterEach(() => {
    document.documentElement.innerHTML = "";
  });

  it("renders the mock task list and counter on load", () => {
    expect(getRows().length).toBe(6);
    expect(document.querySelector("#task-counter")?.textContent).toBe("6 tasks · 4 pending");
  });

  it("shows an inline error and does not add a task when description is empty", () => {
    const before = getRows().length;

    document.querySelector<HTMLFormElement>("#add-task-form")!.requestSubmit();

    const error = document.querySelector<HTMLElement>("#description-error");
    expect(error?.hidden).toBe(false);
    expect(error?.textContent).toBeTruthy();
    expect(getRows().length).toBe(before);
  });

  it("clears the inline error on the next keystroke", () => {
    document.querySelector<HTMLFormElement>("#add-task-form")!.requestSubmit();
    const input = document.querySelector<HTMLInputElement>('input[name="description"]')!;

    input.value = "N";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(document.querySelector<HTMLElement>("#description-error")?.hidden).toBe(true);
  });

  it("adds a new task and updates the counter", () => {
    const before = getRows().length;
    const input = document.querySelector<HTMLInputElement>('input[name="description"]')!;
    input.value = "New task";

    document.querySelector<HTMLFormElement>("#add-task-form")!.requestSubmit();

    expect(getRows().length).toBe(before + 1);
    expect(document.querySelector("#task-counter")?.textContent).toContain(`${before + 1} task`);
    expect(Array.from(getRows()).some((row) => row.textContent?.includes("New task"))).toBe(true);
  });

  it("toggles a task's completion state and updates the pending count", () => {
    const counterBefore = document.querySelector("#task-counter")?.textContent;
    const row = getRows()[0];
    const completeBtn = row.querySelector<HTMLButtonElement>(".icon-btn--complete")!;

    completeBtn.click();

    expect(document.querySelector("#task-counter")?.textContent).not.toBe(counterBefore);
    expect(document.querySelector("#task-counter")?.textContent).toContain("3 pending");
  });

  it("deletes a task", () => {
    const before = getRows().length;
    const row = getRows()[0];
    const description = row.querySelector(".task-description")?.textContent;
    const deleteBtn = row.querySelector<HTMLButtonElement>(".icon-btn--delete")!;

    deleteBtn.click();

    expect(getRows().length).toBe(before - 1);
    expect(Array.from(getRows()).some((r) => r.textContent?.includes(description ?? ""))).toBe(false);
  });

  it("filters to pending tasks when the Pending toggle is clicked", () => {
    const pendingBtn = document.querySelector<HTMLButtonElement>('.toggle-btn[data-status="pending"]')!;

    pendingBtn.click();

    expect(pendingBtn.classList.contains("is-active")).toBe(true);
    expect(getRows().length).toBe(4);
    getRows().forEach((row) => expect(row.dataset.status).toBe("incomplete"));
  });

  it("filters tasks by search query", () => {
    const search = document.querySelector<HTMLInputElement>('input[name="q"]')!;

    search.value = "groceries";
    search.dispatchEvent(new Event("input", { bubbles: true }));

    expect(getRows().length).toBe(1);
    expect(getRows()[0].textContent).toContain("Buy groceries");
  });

  it("enters edit mode and saves a new description", () => {
    const row = getRows()[0];
    const editBtn = row.querySelector<HTMLButtonElement>(".icon-btn--edit")!;

    editBtn.click();

    const editingRow = document.querySelector<HTMLElement>(`.task[data-id="${row.dataset.id}"]`)!;
    const editInput = editingRow.querySelector<HTMLInputElement>(".task-edit-input")!;
    editInput.value = "Updated description";
    editingRow.querySelector<HTMLButtonElement>(".btn-save")!.click();

    const updatedRow = document.querySelector<HTMLElement>(`.task[data-id="${row.dataset.id}"]`)!;
    expect(updatedRow.querySelector(".task-description")?.textContent).toBe("Updated description");
  });

  it("discards changes when edit is cancelled", () => {
    const row = getRows()[0];
    const originalDescription = row.querySelector(".task-description")?.textContent;
    const editBtn = row.querySelector<HTMLButtonElement>(".icon-btn--edit")!;

    editBtn.click();

    const editingRow = document.querySelector<HTMLElement>(`.task[data-id="${row.dataset.id}"]`)!;
    const editInput = editingRow.querySelector<HTMLInputElement>(".task-edit-input")!;
    editInput.value = "Should not be saved";
    editingRow.querySelector<HTMLButtonElement>(".btn-cancel")!.click();

    const updatedRow = document.querySelector<HTMLElement>(`.task[data-id="${row.dataset.id}"]`)!;
    expect(updatedRow.querySelector(".task-description")?.textContent).toBe(originalDescription);
  });
});
