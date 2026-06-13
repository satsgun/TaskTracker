import type { Priority, RowState, Task } from "./types";

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function offsetDate(days: number, from: Date = new Date()): string {
  const ms = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + days);
  return toIsoDate(new Date(ms));
}

export function isOverdue(task: Task, today: Date = new Date()): boolean {
  if (!task.due_date) {
    return false;
  }
  return task.due_date < toIsoDate(today);
}

export function rowState(task: Task, today: Date = new Date()): RowState {
  if (task.status === "Complete") {
    return "complete";
  }
  return isOverdue(task, today) ? "overdue" : "incomplete";
}

export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

