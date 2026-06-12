export interface AuthResult {
  ok: boolean;
  error?: string;
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
