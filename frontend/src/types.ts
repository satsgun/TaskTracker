export type Priority = "High" | "Medium" | "Low";
export type Status = "Incomplete" | "Complete";
export type StatusFilter = "pending" | "all";
export type RowState = "overdue" | "complete" | "incomplete";

export interface Task {
  id: number;
  description: string;
  priority: Priority;
  due_date: string | null;
  status: Status;
}
