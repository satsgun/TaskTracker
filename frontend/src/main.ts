import { getCurrentUser, login, signup } from "./auth";
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

function initSignupForm(): void {
  const signupForm = document.querySelector<HTMLFormElement>("#signup-form");
  const firstNameInput = document.querySelector<HTMLInputElement>('#signup-form input[name="first_name"]');
  const lastNameInput = document.querySelector<HTMLInputElement>('#signup-form input[name="last_name"]');
  const emailInput = document.querySelector<HTMLInputElement>('#signup-form input[name="email"]');
  const passwordInput = document.querySelector<HTMLInputElement>('#signup-form input[name="password"]');
  const errorEl = document.querySelector<HTMLElement>("#signup-error");

  if (!signupForm || !firstNameInput || !lastNameInput || !emailInput || !passwordInput || !errorEl) {
    return;
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const result = await signup(
      firstNameInput.value,
      lastNameInput.value,
      emailInput.value,
      passwordInput.value,
    );

    if (!result.ok) {
      errorEl.textContent = result.error ?? "Something went wrong. Please try again.";
      errorEl.hidden = false;
      return;
    }

    errorEl.hidden = true;
  });
}

function initLoginForm(onSuccess: () => void): void {
  const loginForm = document.querySelector<HTMLFormElement>("#login-form");
  const emailInput = document.querySelector<HTMLInputElement>('#login-form input[name="email"]');
  const passwordInput = document.querySelector<HTMLInputElement>('#login-form input[name="password"]');
  const errorEl = document.querySelector<HTMLElement>("#login-error");

  if (!loginForm || !emailInput || !passwordInput || !errorEl) {
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const result = await login(emailInput.value, passwordInput.value);

    if (!result.ok) {
      errorEl.textContent = result.error ?? "Something went wrong. Please try again.";
      errorEl.hidden = false;
      return;
    }

    errorEl.hidden = true;
    onSuccess();
  });
}

function initAuthToggle(): void {
  const signupForm = document.querySelector<HTMLElement>("#signup-form");
  const loginForm = document.querySelector<HTMLElement>("#login-form");
  const showLoginBtn = document.querySelector<HTMLButtonElement>("#show-login");
  const showSignupBtn = document.querySelector<HTMLButtonElement>("#show-signup");

  if (!signupForm || !loginForm || !showLoginBtn || !showSignupBtn) {
    return;
  }

  showLoginBtn.addEventListener("click", () => {
    signupForm.hidden = true;
    loginForm.hidden = false;
  });

  showSignupBtn.addEventListener("click", () => {
    loginForm.hidden = true;
    signupForm.hidden = false;
  });
}

async function init(): Promise<void> {
  initTheme();
  initSignupForm();
  initAuthToggle();

  const authView = document.querySelector<HTMLElement>("#auth-view");
  const taskView = document.querySelector<HTMLElement>("#task-view");

  function showAuthView(): void {
    if (authView) authView.hidden = false;
    if (taskView) taskView.hidden = true;
  }

  function showTaskView(): void {
    if (authView) authView.hidden = true;
    if (taskView) taskView.hidden = false;
  }

  initLoginForm(() => {
    showTaskView();
    void fetchTasks();
  });

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

    const title = document.createElement("p");
    title.className = "state-panel-title";
    const subtitle = document.createElement("p");
    subtitle.className = "state-panel-subtitle";
    const isFiltered = searchQuery !== "" || statusFilter !== "all";

    if (isFiltered) {
      title.textContent = searchQuery ? `No tasks match "${searchQuery}"` : "No tasks match the current filter";
      subtitle.textContent = "Try a different keyword, or switch the filter to All.";
      emptyStateEl!.appendChild(title);
      emptyStateEl!.appendChild(subtitle);

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
      title.textContent = "No tasks yet";
      subtitle.textContent = "Add your first task above to get started.";
      emptyStateEl!.appendChild(title);
      emptyStateEl!.appendChild(subtitle);

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
      // Only update the counter when there are truly no tasks at all (no
      // search/filter applied). If a search or filter yields zero results,
      // `tasks` holds that empty filtered set, so updating the counter here
      // would overwrite it with "0 tasks" even though tasks still exist -
      // leave the previous total displayed instead.
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
      const response = await fetch(`/tasks/list?${params.toString()}`, { credentials: "same-origin" });
      if (response.status === 401) {
        showAuthView();
        return;
      }

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

  async function patchTask(
    id: number,
    init: RequestInit,
    onSuccess: () => void,
    onError: () => void,
  ): Promise<void> {
    try {
      const response = await fetch(`/tasks/${id}/`, { ...init, credentials: "same-origin" });
      if (response.status === 401) {
        showAuthView();
        return;
      }

      if (!response.ok) {
        onError();
        return;
      }

      onSuccess();
    } catch {
      onError();
    }
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
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          priority: (priorityInput.value as Priority) || "Medium",
          due_date: dueInput.value || null,
        }),
      });

      if (response.status === 401) {
        showAuthView();
        return;
      }

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
      void patchTask(
        id,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
        () => {
          task.status = newStatus;
          render();
        },
        () => showBanner(`Couldn't update "${task.description}". Please try again.`),
      );
    } else if (target.closest(".icon-btn--delete")) {
      void patchTask(
        id,
        { method: "DELETE" },
        () => {
          tasks = tasks.filter((t) => t.id !== id);
          render();
        },
        () => showBanner(`Couldn't delete "${task.description}". Please try again.`),
      );
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

      void patchTask(
        id,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: newDescription }),
        },
        () => {
          task.description = newDescription;
          editingId = null;
          render();
        },
        () => {
          editingId = null;
          showBanner(`Couldn't update "${task.description}". Please try again.`);
          render();
        },
      );
    } else if (target.closest(".btn-cancel")) {
      editingId = null;
      render();
    }
  });

  const user = await getCurrentUser();
  if (user) {
    showTaskView();
    void fetchTasks();
  } else {
    showAuthView();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
