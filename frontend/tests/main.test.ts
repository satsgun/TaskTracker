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
    localStorage.clear();
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

describe("Theme toggle", () => {
  afterEach(() => {
    document.documentElement.innerHTML = "";
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
  });

  it("defaults to the light theme when no preference is stored", async () => {
    await loadApp();

    expect(document.documentElement.dataset.theme).toBe("light");

    const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle")!;
    expect(toggle.textContent).toBe("🌙");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("switches to dark mode when the toggle is clicked and persists the choice", async () => {
    await loadApp();

    const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle")!;
    toggle.click();

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(toggle.textContent).toBe("☀️");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("toggles back to light mode on a second click", async () => {
    await loadApp();

    const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle")!;
    toggle.click();
    toggle.click();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(toggle.textContent).toBe("🌙");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("applies a previously stored theme preference on load", async () => {
    localStorage.setItem("theme", "dark");

    await loadApp();

    expect(document.documentElement.dataset.theme).toBe("dark");
    const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle")!;
    expect(toggle.textContent).toBe("☀️");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});
