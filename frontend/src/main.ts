import { renderCounter, renderTaskList } from "./render";
import { createMockTasks, filterTasks } from "./tasks";
import type { Priority, StatusFilter, Task } from "./types";

function init(): void {
  const form = document.querySelector<HTMLFormElement>("#add-task-form");
  const descriptionInput = document.querySelector<HTMLInputElement>('input[name="description"]');
  const priorityInput = document.querySelector<HTMLSelectElement>('select[name="priority"]');
  const dueInput = document.querySelector<HTMLInputElement>('input[name="due_date"]');
  const errorEl = document.querySelector<HTMLElement>("#description-error");
  const taskList = document.querySelector<HTMLElement>("#task-list");
  const counter = document.querySelector<HTMLElement>("#task-counter");
  const toggleButtons = document.querySelectorAll<HTMLButtonElement>(".toggle-btn");
  const searchInput = document.querySelector<HTMLInputElement>('input[name="q"]');

  if (
    !form ||
    !descriptionInput ||
    !priorityInput ||
    !dueInput ||
    !errorEl ||
    !taskList ||
    !counter ||
    !searchInput
  ) {
    return;
  }

  let tasks: Task[] = createMockTasks();
  let nextId = tasks.length + 1;
  let statusFilter: StatusFilter = "all";
  let searchQuery = "";
  let editingId: number | null = null;

  function render(): void {
    renderCounter(counter as HTMLElement, tasks);
    renderTaskList(
      taskList as HTMLElement,
      filterTasks(tasks, statusFilter, searchQuery),
      new Date(),
      editingId,
    );
  }

  function showError(message: string): void {
    errorEl!.textContent = message;
    errorEl!.hidden = false;
  }

  function clearError(): void {
    errorEl!.textContent = "";
    errorEl!.hidden = true;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    if (!description) {
      showError("Description is required.");
      return;
    }

    tasks.push({
      id: nextId++,
      description,
      priority: (priorityInput.value as Priority) || "Medium",
      due_date: dueInput.value || null,
      status: "Incomplete",
    });

    form.reset();
    clearError();
    render();
  });

  descriptionInput.addEventListener("input", () => {
    if (!errorEl!.hidden) {
      clearError();
    }
  });

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      statusFilter = button.dataset.status as StatusFilter;
      toggleButtons.forEach((b) => b.classList.toggle("is-active", b === button));
      render();
    });
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    render();
  });

  taskList.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>(".task");
    if (!row) {
      return;
    }

    const id = Number(row.dataset.id);
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      return;
    }

    if (target.closest(".icon-btn--complete")) {
      task.status = task.status === "Complete" ? "Incomplete" : "Complete";
      render();
    } else if (target.closest(".icon-btn--delete")) {
      tasks = tasks.filter((t) => t.id !== id);
      render();
    } else if (target.closest(".icon-btn--edit")) {
      editingId = editingId === id ? null : id;
      render();
    } else if (target.closest(".btn-save")) {
      const input = row.querySelector<HTMLInputElement>(".task-edit-input");
      const newDescription = input?.value.trim();
      if (newDescription) {
        task.description = newDescription;
      }
      editingId = null;
      render();
    } else if (target.closest(".btn-cancel")) {
      editingId = null;
      render();
    }
  });

  render();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
