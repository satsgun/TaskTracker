import type { Priority, RowState, StatusFilter, Task } from "./types";

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

export function filterTasks(tasks: Task[], status: StatusFilter, query: string): Task[] {
  const q = query.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesStatus = status === "all" || task.status === "Incomplete";
    const matchesQuery = q === "" || task.description.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });
}

export function createMockTasks(today: Date = new Date()): Task[] {
  return [
    {
      id: 1,
      description: "Pay electricity bill",
      priority: "High",
      due_date: offsetDate(-10, today),
      status: "Incomplete",
    },
    {
      id: 2,
      description: "Write quarterly report",
      priority: "High",
      due_date: null,
      status: "Incomplete",
    },
    {
      id: 3,
      description: "Send invoice",
      priority: "Medium",
      due_date: offsetDate(-6, today),
      status: "Complete",
    },
    {
      id: 4,
      description: "Clean garage",
      priority: "Medium",
      due_date: offsetDate(3, today),
      status: "Complete",
    },
    {
      id: 5,
      description: "Buy groceries",
      priority: "Low",
      due_date: offsetDate(9, today),
      status: "Incomplete",
    },
    {
      id: 6,
      description: "Schedule dentist appointment",
      priority: "Low",
      due_date: offsetDate(-8, today),
      status: "Incomplete",
    },
  ];
}
