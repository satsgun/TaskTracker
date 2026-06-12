import { isOverdue, sortByPriority } from "./tasks";
import type { Task } from "./types";

export function formatDueLabel(task: Task, today: Date = new Date()): string {
  if (!task.due_date) {
    return "No due date";
  }

  const formatted = formatDate(task.due_date);

  if (task.status === "Incomplete" && isOverdue(task, today)) {
    return `Overdue · ${formatted}`;
  }

  return `Due ${formatted}`;
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

export function renderCounter(el: HTMLElement, tasks: Task[]): void {
  const total = tasks.length;
  const pending = tasks.filter((task) => task.status === "Incomplete").length;
  el.textContent = `${total} task${total === 1 ? "" : "s"} · ${pending} pending`;
}

export function renderTaskList(
  container: HTMLElement,
  tasks: Task[],
  today: Date = new Date(),
  editingId: number | null = null,
): void {
  container.innerHTML = "";
  for (const task of sortByPriority(tasks)) {
    container.appendChild(renderTaskRow(task, today, task.id === editingId));
  }
}

function renderTaskRow(task: Task, today: Date, isEditing: boolean): HTMLLIElement {
  const li = document.createElement("li");
  const state = rowStateOf(task, today);

  li.className = `task task--${state}`;
  li.dataset.id = String(task.id);
  li.dataset.status = task.status.toLowerCase();
  li.dataset.priority = task.priority.toLowerCase();

  li.innerHTML = `
    <span class="task-accent"></span>
    ${renderCompleteToggle(task)}
    ${isEditing ? renderEditMain(task) : renderDisplayMain(task, today)}
    ${isEditing ? "" : renderTaskMeta(task)}
  `;

  return li;
}

function rowStateOf(task: Task, today: Date): "overdue" | "complete" | "incomplete" {
  if (task.status === "Complete") {
    return "complete";
  }
  return isOverdue(task, today) ? "overdue" : "incomplete";
}

function renderDisplayMain(task: Task, today: Date): string {
  return `
    <div class="task-main">
      <p class="task-description">${escapeHtml(task.description)}</p>
      <p class="task-due">${formatDueLabel(task, today)}</p>
    </div>
  `;
}

function renderEditMain(task: Task): string {
  return `
    <div class="task-main task-main--editing">
      <input type="text" class="task-edit-input" value="${escapeAttr(task.description)}" />
      <div class="task-edit-actions">
        <button type="button" class="btn btn-save">Save</button>
        <button type="button" class="btn btn-cancel">Cancel</button>
      </div>
    </div>
  `;
}

function renderCompleteToggle(task: Task): string {
  const isComplete = task.status === "Complete";
  return `<button class="icon-btn icon-btn--complete" aria-label="${isComplete ? "Mark incomplete" : "Mark complete"}">${isComplete ? "●" : "○"}</button>`;
}

function renderTaskMeta(task: Task): string {
  return `
    <div class="task-meta">
      <span class="priority-badge priority-badge--${task.priority.toLowerCase()}">${task.priority}</span>
      <div class="task-actions">
        <button class="icon-btn icon-btn--edit" aria-label="Edit task">✎</button>
        <button class="icon-btn icon-btn--delete" aria-label="Delete task">🗑</button>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
