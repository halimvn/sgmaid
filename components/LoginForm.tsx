"use client";

/** Presentational-only login form for Phase 0 — no auth endpoint yet (arrives in Phase 2). */
export default function LoginForm() {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" type="email" placeholder="you@example.com" autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" placeholder="••••••••" autoComplete="current-password" />
      </div>
      <button className="btn btn--primary btn--block" type="submit">Log In</button>
    </form>
  );
}
