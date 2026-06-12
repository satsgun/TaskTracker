export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface CurrentUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await fetch("/auth/me", { credentials: "same-origin" });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const body = await response.json();

    if (!response.ok) {
      return { ok: false, error: body.detail ?? "Something went wrong. Please try again." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

export async function signup(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const response = await fetch("/auth/signup", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      return { ok: false, error: body.detail ?? "Something went wrong. Please try again." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
