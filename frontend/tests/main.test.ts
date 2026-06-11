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
});
