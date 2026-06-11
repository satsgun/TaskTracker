import { renderCounter, renderTaskList } from "./render";
import type { Priority, StatusFilter, Task } from "./types";

function init(): void {
  const form = document.querySelector<HTMLFormElement>("#add-task-form");
  const descriptionInput = document.querySelector<HTMLInputElement>('input[name="description"]');
  const priorityInput = document.querySelector<HTMLSelectElement>('select[name="priority"]');
  const dueInput = document.querySelector<HTMLInputElement>('input[name="due_date"]');
  const errorEl = document.querySelector<HTMLElement>("#description-error");
  const taskListEl = document.querySelector<HTMLElement>("#task-list");
  const counter = document.querySelector<HTMLElement>("#task-counter");
  const toggleButtons = document.querySelectorAll<HTMLButtonElement>(".toggle-btn");
  const searchInput = document.querySelector<HTMLInputElement>('input[name="q"]');
  const addTaskEl = document.querySelector<HTMLElement>(".add-task");
  const filterBarEl = document.querySelector<HTMLElement>(".filter-bar");
  const legendEl = document.querySelector<HTMLElement>(".legend");
  const errorStateEl = document.querySelector<HTMLElement>("#error-state");
  const retryBtn = document.querySelector<HTMLButtonElement>("#retry-btn");
  const emptyStateEl = document.querySelector<HTMLElement>("#empty-state");

  if (
    !form ||
    !descriptionInput ||
    !priorityInput ||
    !dueInput ||
    !errorEl ||
    !taskListEl ||
    !counter ||
    !searchInput ||
    !addTaskEl ||
    !filterBarEl ||
    !legendEl ||
    !errorStateEl ||
    !retryBtn ||
    !emptyStateEl
  ) {
    return;
  }

  let tasks: Task[] = [];
  let statusFilter: StatusFilter = "all";
  let searchQuery = "";
  let editingId: number | null = null;

  function renderEmptyState(): void {
    emptyStateEl!.innerHTML = "";

    const message = document.createElement("p");
    const isFiltered = searchQuery !== "" || statusFilter !== "all";

    if (isFiltered) {
      message.textContent = searchQuery
        ? `No tasks match "${searchQuery}".`
        : "No tasks match the current filter.";
      emptyStateEl!.appendChild(message);

      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.id = "clear-search-btn";
      clearBtn.className = "btn btn-secondary";
      clearBtn.textContent = "Clear search";
      clearBtn.addEventListener("click", () => {
        searchInput!.value = "";
        searchQuery = "";
        statusFilter = "all";
        toggleButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.status === "all"));
        void fetchTasks();
      });
      emptyStateEl!.appendChild(clearBtn);

      filterBarEl!.hidden = false;
      legendEl!.hidden = false;
    } else {
      message.textContent = "No tasks yet. Add one above to get started!";
      emptyStateEl!.appendChild(message);

      filterBarEl!.hidden = true;
      legendEl!.hidden = true;
    }

    emptyStateEl!.hidden = false;
    taskListEl!.hidden = true;
    addTaskEl!.hidden = false;
    errorStateEl!.hidden = true;
  }

  function render(): void {
    if (tasks.length === 0) {
      renderEmptyState();
      return;
    }

    errorStateEl!.hidden = true;
    emptyStateEl!.hidden = true;
    taskListEl!.hidden = false;
    filterBarEl!.hidden = false;
    legendEl!.hidden = false;
    addTaskEl!.hidden = false;

    renderCounter(counter as HTMLElement, tasks);
    renderTaskList(taskListEl as HTMLElement, tasks, new Date(), editingId);
  }

  function showErrorState(): void {
    errorStateEl!.hidden = false;
    emptyStateEl!.hidden = true;
    taskListEl!.hidden = true;
    filterBarEl!.hidden = true;
    legendEl!.hidden = true;
    addTaskEl!.hidden = true;
  }

  async function fetchTasks(): Promise<void> {
    const params = new URLSearchParams({ status: statusFilter });
    if (searchQuery) {
      params.set("q", searchQuery);
    }

    try {
      const response = await fetch(`/tasks/list?${params.toString()}`);
      if (!response.ok) {
        showErrorState();
        return;
      }

      tasks = await response.json();
      render();
    } catch {
      showErrorState();
    }
  }

  function showError(message: string): void {
    errorEl!.textContent = message;
    errorEl!.hidden = false;
  }

  function clearError(): void {
    errorEl!.textContent = "";
    errorEl!.hidden = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    if (!description) {
      showError("Description is required.");
      return;
    }

    try {
      const response = await fetch("/tasks/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          priority: (priorityInput.value as Priority) || "Medium",
          due_date: dueInput.value || null,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        showError(body.detail ?? "Something went wrong. Please try again.");
        return;
      }

      tasks.push(body as Task);
      form.reset();
      clearError();
      render();
    } catch {
      showError("Network error. Please try again.");
    }
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
      void fetchTasks();
    });
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    void fetchTasks();
  });

  retryBtn.addEventListener("click", () => {
    void fetchTasks();
  });

  taskListEl.addEventListener("click", (event) => {
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

  void fetchTasks();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
