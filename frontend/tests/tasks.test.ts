import { describe, expect, it } from "vitest";

import {
  createMockTasks,
  filterTasks,
  isOverdue,
  offsetDate,
  rowState,
  sortByPriority,
  toIsoDate,
} from "../src/tasks";
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

describe("isOverdue", () => {
  it("returns false when there is no due date", () => {
    expect(isOverdue(makeTask({ due_date: null }), today)).toBe(false);
  });

  it("returns true when the due date is before today", () => {
    expect(isOverdue(makeTask({ due_date: offsetDate(-1, today) }), today)).toBe(true);
  });

  it("returns false when the due date is today or in the future", () => {
    expect(isOverdue(makeTask({ due_date: toIsoDate(today) }), today)).toBe(false);
    expect(isOverdue(makeTask({ due_date: offsetDate(1, today) }), today)).toBe(false);
  });
});

describe("rowState", () => {
  it("returns 'complete' for completed tasks even if overdue", () => {
    const task = makeTask({ status: "Complete", due_date: offsetDate(-5, today) });
    expect(rowState(task, today)).toBe("complete");
  });

  it("returns 'overdue' for incomplete tasks past their due date", () => {
    const task = makeTask({ status: "Incomplete", due_date: offsetDate(-1, today) });
    expect(rowState(task, today)).toBe("overdue");
  });

  it("returns 'incomplete' for incomplete tasks that are not overdue", () => {
    expect(rowState(makeTask({ due_date: null }), today)).toBe("incomplete");
    expect(rowState(makeTask({ due_date: offsetDate(1, today) }), today)).toBe("incomplete");
  });
});

describe("sortByPriority", () => {
  it("orders High before Medium before Low", () => {
    const tasks = [
      makeTask({ id: 1, priority: "Low" }),
      makeTask({ id: 2, priority: "High" }),
      makeTask({ id: 3, priority: "Medium" }),
    ];

    expect(sortByPriority(tasks).map((t) => t.priority)).toEqual(["High", "Medium", "Low"]);
  });

  it("does not mutate the input array", () => {
    const tasks = [makeTask({ id: 1, priority: "Low" }), makeTask({ id: 2, priority: "High" })];
    const original = [...tasks];

    sortByPriority(tasks);

    expect(tasks).toEqual(original);
  });
});

describe("filterTasks", () => {
  const tasks = createMockTasks(today);

  it("returns only incomplete tasks for the 'pending' filter", () => {
    const result = filterTasks(tasks, "pending", "");

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.status === "Incomplete")).toBe(true);
  });

  it("returns all tasks for the 'all' filter", () => {
    expect(filterTasks(tasks, "all", "")).toHaveLength(tasks.length);
  });

  it("filters by case-insensitive description match", () => {
    const result = filterTasks(tasks, "all", "GROCER");

    expect(result).toHaveLength(1);
    expect(result[0].description.toLowerCase()).toContain("grocer");
  });

  it("combines status and search filters", () => {
    const result = filterTasks(tasks, "pending", "invoice");

    expect(result).toHaveLength(0);
  });
});

describe("createMockTasks", () => {
  it("creates 6 tasks with 4 pending", () => {
    const tasks = createMockTasks(today);

    expect(tasks).toHaveLength(6);
    expect(tasks.filter((t) => t.status === "Incomplete")).toHaveLength(4);
  });

  it("includes at least one overdue, one complete, and one not-overdue incomplete task", () => {
    const tasks = createMockTasks(today);

    expect(tasks.some((t) => rowState(t, today) === "overdue")).toBe(true);
    expect(tasks.some((t) => rowState(t, today) === "complete")).toBe(true);
    expect(tasks.some((t) => rowState(t, today) === "incomplete")).toBe(true);
  });
});
