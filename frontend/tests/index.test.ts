import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";

describe("index.html structure", () => {
  let document: Document;

  beforeAll(() => {
    const html = readFileSync(resolve(__dirname, "../index.html"), "utf-8");
    document = new JSDOM(html).window.document;
  });

  it("renders the header with title and task counter", () => {
    expect(document.querySelector(".app-header h1")?.textContent).toBe("Task Tracker");
    expect(document.querySelector("#task-counter")?.textContent).toMatch(/\d+ tasks? · \d+ pending/);
  });

  it("renders the add task form with the required fields", () => {
    const form = document.querySelector("#add-task-form");

    expect(form).not.toBeNull();
    expect(form?.querySelector('input[name="description"]')).not.toBeNull();
    expect(form?.querySelector('select[name="priority"]')).not.toBeNull();
    expect(form?.querySelector('input[name="due_date"]')).not.toBeNull();
    expect(form?.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it("defaults the priority field to Medium", () => {
    const select = document.querySelector<HTMLSelectElement>('select[name="priority"]');

    expect(select?.querySelector('option[selected]')?.getAttribute("value")).toBe("Medium");
  });

  it("includes a hidden inline error placeholder for the description field", () => {
    const error = document.querySelector("#description-error");

    expect(error).not.toBeNull();
    expect(error?.hasAttribute("hidden")).toBe(true);
  });

  it("renders the filter bar with a status toggle and search input", () => {
    const filterBar = document.querySelector(".filter-bar");

    expect(filterBar).not.toBeNull();
    expect(filterBar?.querySelectorAll(".toggle-btn")).toHaveLength(2);
    expect(filterBar?.querySelector('input[name="q"]')).not.toBeNull();
  });

  it("renders the color legend with three states", () => {
    expect(document.querySelectorAll(".legend-item")).toHaveLength(3);
  });

  it("renders task rows for each color state", () => {
    expect(document.querySelectorAll(".task--overdue").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".task--complete").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".task--incomplete").length).toBeGreaterThan(0);
  });

  it("renders a priority badge for every task row", () => {
    const rows = document.querySelectorAll(".task");
    const badges = document.querySelectorAll(".priority-badge");

    expect(rows.length).toBeGreaterThan(0);
    expect(badges).toHaveLength(rows.length);
  });

  it("gives each task row mark-complete, edit, and delete actions", () => {
    const rows = document.querySelectorAll(".task");

    rows.forEach((row) => {
      expect(row.querySelector(".icon-btn--complete")).not.toBeNull();
      expect(row.querySelector(".icon-btn--edit")).not.toBeNull();
      expect(row.querySelector(".icon-btn--delete")).not.toBeNull();
    });
  });

  it("sorts task rows by priority (high, then medium, then low)", () => {
    const order = { high: 0, medium: 1, low: 2 };
    const priorities = Array.from(document.querySelectorAll(".task")).map(
      (row) => row.getAttribute("data-priority"),
    );
    const sorted = [...priorities].sort(
      (a, b) => order[a as keyof typeof order] - order[b as keyof typeof order],
    );

    expect(priorities).toEqual(sorted);
  });
});
