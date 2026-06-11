import { describe, expect, it } from "vitest";

import { formatDueLabel, renderCounter, renderTaskList } from "../src/render";
import { createMockTasks, offsetDate } from "../src/tasks";
import type { Task } from "../src/types";

const today = new Date("2026-06-11T00:00:00Z");

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 1,
    description: "Sample task",
    priority: "Low",
    due_date: null,
    status: "Incomplete",
    ...overrides,
  };
}

describe("renderCounter", () => {
  it("shows the total task count and pending count", () => {
    const el = document.createElement("p");

    renderCounter(el, createMockTasks(today));

    expect(el.textContent).toBe("6 tasks · 4 pending");
  });

  it("uses singular 'task' when there is exactly one", () => {
    const el = document.createElement("p");

    renderCounter(el, [makeTask({ status: "Incomplete" })]);

    expect(el.textContent).toBe("1 task · 1 pending");
  });
});

describe("renderTaskList", () => {
  it("renders one row per task, sorted by priority", () => {
    const container = document.createElement("ul");

    renderTaskList(container, createMockTasks(today), today);

    const rows = container.querySelectorAll(".task");
    expect(rows).toHaveLength(6);

    const priorities = Array.from(rows).map((row) => (row as HTMLElement).dataset.priority);
    expect(priorities).toEqual(["high", "high", "medium", "medium", "low", "low"]);
  });

  it("applies the correct color-state class per row", () => {
    const container = document.createElement("ul");

    renderTaskList(container, createMockTasks(today), today);

    const rows = container.querySelectorAll(".task");
    // "Pay electricity bill": High priority, overdue, incomplete
    expect(rows[0].classList.contains("task--overdue")).toBe(true);
    // "Send invoice": Medium priority, overdue but complete -> green wins
    expect(rows[2].classList.contains("task--complete")).toBe(true);
  });

  it("renders a priority badge and action buttons for each row", () => {
    const container = document.createElement("ul");

    renderTaskList(container, createMockTasks(today), today);

    container.querySelectorAll(".task").forEach((row) => {
      expect(row.querySelector(".priority-badge")).not.toBeNull();
      expect(row.querySelector(".icon-btn--complete")).not.toBeNull();
      expect(row.querySelector(".icon-btn--edit")).not.toBeNull();
      expect(row.querySelector(".icon-btn--delete")).not.toBeNull();
    });
  });

  it("renders Save/Cancel inputs for the row matching editingId", () => {
    const container = document.createElement("ul");
    const tasks = createMockTasks(today);

    renderTaskList(container, tasks, today, tasks[0].id);

    const editingRow = container.querySelector(`.task[data-id="${tasks[0].id}"]`);
    expect(editingRow?.querySelector(".task-edit-input")).not.toBeNull();
    expect(editingRow?.querySelector(".btn-save")).not.toBeNull();
    expect(editingRow?.querySelector(".btn-cancel")).not.toBeNull();

    const otherRow = container.querySelector(`.task[data-id="${tasks[1].id}"]`);
    expect(otherRow?.querySelector(".task-edit-input")).toBeNull();
  });
});

describe("formatDueLabel", () => {
  it("shows 'No due date' when there is none", () => {
    expect(formatDueLabel(makeTask({ due_date: null }), today)).toBe("No due date");
  });

  it("shows an 'Overdue' label for overdue incomplete tasks", () => {
    const label = formatDueLabel(makeTask({ due_date: offsetDate(-1, today) }), today);
    expect(label).toMatch(/^Overdue · /);
  });

  it("shows a plain 'Due' label for future incomplete tasks", () => {
    const label = formatDueLabel(makeTask({ due_date: offsetDate(1, today) }), today);
    expect(label).toMatch(/^Due /);
  });

  it("shows a plain 'Due' label for completed tasks even if overdue", () => {
    const label = formatDueLabel(
      makeTask({ due_date: offsetDate(-1, today), status: "Complete" }),
      today,
    );
    expect(label).toMatch(/^Due /);
  });
});
