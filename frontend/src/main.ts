import { getCurrentUser, login, logout, signup } from "./auth";
import { renderCounter, renderTaskList } from "./render";
import type { Priority, StatusFilter, Task } from "./types";

const THEME_STORAGE_KEY = "theme";
type Theme = "light" | "dark";

const MIN_PASSWORD_LENGTH = 8;
const SEARCH_DEBOUNCE_MS = 250;

const EYE_ICON_PATHS = '<circle cx="12" cy="12" r="2"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>';
const EYE_OFF_ICON_PATHS =
  '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.1"/>' +
  '<path d="M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';

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

function initSignupForm(onSuccess: () => void): void {
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

    const loginResult = await login(emailInput.value, passwordInput.value);
    if (!loginResult.ok) {
      errorEl.textContent = loginResult.error ?? "Something went wrong. Please try again.";
      errorEl.hidden = false;
      return;
    }

    onSuccess();
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
  const subtitle = document.querySelector<HTMLElement>("#auth-subtitle");

  if (!signupForm || !loginForm || !showLoginBtn || !showSignupBtn) {
    return;
  }

  showLoginBtn.addEventListener("click", () => {
    signupForm.hidden = true;
    loginForm.hidden = false;
    if (subtitle) subtitle.textContent = "Sign in to your account";
  });

  showSignupBtn.addEventListener("click", () => {
    loginForm.hidden = true;
    signupForm.hidden = false;
    if (subtitle) subtitle.textContent = "Create your account";
  });
}

function initPasswordToggles(): void {
  document.querySelectorAll<HTMLButtonElement>(".pw-toggle").forEach((toggle) => {
    const input = document.getElementById(toggle.dataset.target ?? "") as HTMLInputElement | null;
    const icon = toggle.querySelector("svg");

    if (!input || !icon) {
      return;
    }

    toggle.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      icon.classList.toggle("ti-eye", showing);
      icon.classList.toggle("ti-eye-off", !showing);
      icon.innerHTML = showing ? EYE_ICON_PATHS : EYE_OFF_ICON_PATHS;
      toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
  });
}

function initSignupPasswordConfirmation(): void {
  const passwordInput = document.querySelector<HTMLInputElement>('#signup-form input[name="password"]');
  const confirmInput = document.querySelector<HTMLInputElement>('#signup-form input[name="confirm_password"]');
  const errorEl = document.querySelector<HTMLElement>("#signup-confirm-password-error");
  const submitBtn = document.querySelector<HTMLButtonElement>('#signup-form button[type="submit"]');

  if (!passwordInput || !confirmInput || !errorEl || !submitBtn) {
    return;
  }

  function validate(): void {
    const password = passwordInput!.value;
    const confirm = confirmInput!.value;
    const matches = password !== "" && password === confirm;
    const mismatched = confirm !== "" && !matches;

    errorEl!.hidden = !mismatched;
    confirmInput!.classList.toggle("mismatch", mismatched);
    submitBtn!.disabled = !(matches && password.length >= MIN_PASSWORD_LENGTH);
  }

  passwordInput.addEventListener("input", validate);
  confirmInput.addEventListener("input", validate);
  validate();
}

async function init(): Promise<void> {
  initTheme();
  initAuthToggle();
  initPasswordToggles();
  initSignupPasswordConfirmation();

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

  async function fetchAuthed(url: string, init?: RequestInit): Promise<Response | null> {
    const response = await fetch(url, { ...init, credentials: "same-origin" });
    if (response.status === 401) {
      showAuthView();
      return null;
    }

    return response;
  }

  initLoginForm(() => {
    showTaskView();
    void fetchTasks();
  });

  initSignupForm(() => {
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
  const logoutBtn = document.querySelector<HTMLButtonElement>("#logout-btn");

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
    !bannerDismissBtn ||
    !logoutBtn
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
      const response = await fetchAuthed(`/tasks/list?${params.toString()}`);
      if (response === null) {
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
      const response = await fetchAuthed(`/tasks/${id}/`, init);
      if (response === null) {
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

  logoutBtn.addEventListener("click", () => {
    void logout().then(() => {
      tasks = [];
      editingId = null;
      showAuthView();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    if (!description) {
      showError("Description is required.");
      return;
    }

    try {
      const response = await fetchAuthed("/tasks/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          priority: (priorityInput.value as Priority) || "Medium",
          due_date: dueInput.value || null,
        }),
      });

      if (response === null) {
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

  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      void fetchTasks();
    }, SEARCH_DEBOUNCE_MS);
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

  const currentUser = await getCurrentUser();
  if (currentUser.status === "ok") {
    showTaskView();
    void fetchTasks();
  } else if (currentUser.status === "unauthenticated") {
    showAuthView();
  } else {
    showTaskView();
    showErrorState();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
