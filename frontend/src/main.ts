import { renderCounter, renderTaskList } from "./render";
import type { Priority, StatusFilter, Task } from "./types";

const THEME_STORAGE_KEY = "theme";
type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme, toggle: HTMLButtonElement | null): void {
  document.documentElement.dataset.theme = theme;

  if (toggle) {
    toggle.textContent = theme === "dark" ? "☀️" : "🌙";
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
}

function initTheme(): void {
  const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
  let theme = getPreferredTheme();

  applyTheme(theme, toggle);

  toggle?.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme, toggle);
  });
}

function init(): void {
  initTheme();

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
  const actionBannerEl = document.querySelector<HTMLElement>("#action-banner");
  const bannerMessageEl = document.querySelector<HTMLElement>("#action-banner .banner-message");
  const bannerDismissBtn = document.querySelector<HTMLButtonElement>("#action-banner .banner-dismiss");

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
    !emptyStateEl ||
    !actionBannerEl ||
    !bannerMessageEl ||
    !bannerDismissBtn
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
      if (searchQuery === "" && statusFilter === "all") {
        renderCounter(counter as HTMLElement, tasks);
      }
      return;
    }

    renderCounter(counter as HTMLElement, tasks);

    errorStateEl!.hidden = true;
    emptyStateEl!.hidden = true;
    taskListEl!.hidden = false;
    filterBarEl!.hidden = false;
    legendEl!.hidden = false;
    addTaskEl!.hidden = false;

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

  function showBanner(message: string): void {
    bannerMessageEl!.textContent = message;
    actionBannerEl!.hidden = false;
  }

  bannerDismissBtn.addEventListener("click", () => {
    actionBannerEl!.hidden = true;
  });

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
      const newStatus = task.status === "Complete" ? "Incomplete" : "Complete";
      void (async () => {
        try {
          const response = await fetch(`/tasks/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });

          if (!response.ok) {
            showBanner(`Couldn't update "${task.description}". Please try again.`);
            return;
          }

          task.status = newStatus;
          render();
        } catch {
          showBanner(`Couldn't update "${task.description}". Please try again.`);
        }
      })();
    } else if (target.closest(".icon-btn--delete")) {
      void (async () => {
        try {
          const response = await fetch(`/tasks/${id}/`, { method: "DELETE" });

          if (!response.ok) {
            showBanner(`Couldn't delete "${task.description}". Please try again.`);
            return;
          }

          tasks = tasks.filter((t) => t.id !== id);
          render();
        } catch {
          showBanner(`Couldn't delete "${task.description}". Please try again.`);
        }
      })();
    } else if (target.closest(".icon-btn--edit")) {
      editingId = editingId === id ? null : id;
      render();
    } else if (target.closest(".btn-save")) {
      const input = row.querySelector<HTMLInputElement>(".task-edit-input");
      const newDescription = input?.value.trim();
      if (!newDescription) {
        editingId = null;
        render();
        return;
      }

      void (async () => {
        try {
          const response = await fetch(`/tasks/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: newDescription }),
          });

          editingId = null;

          if (!response.ok) {
            showBanner(`Couldn't update "${task.description}". Please try again.`);
            render();
            return;
          }

          task.description = newDescription;
          render();
        } catch {
          editingId = null;
          showBanner(`Couldn't update "${task.description}". Please try again.`);
          render();
        }
      })();
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
