import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";

import { Logo } from "../components/Layout.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth, useAuthMutation } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { safeNext } from "../lib/utils.js";

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="container-page flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">{subtitle}</p>
        </div>
        <div className="card p-6 shadow-xl shadow-stone-900/[0.04] sm:p-8 dark:shadow-none">{children}</div>
        <p className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">{footer}</p>
      </div>
    </div>
  );
}

function TextField({ id, label, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} name={id} className="input" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </div>
  );
}

function useAuthForm(initial, mutationFn, successMessage) {
  const [form, setForm] = useState(initial);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useAuthMutation(mutationFn);
  const next = safeNext(params.get("next"));

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(form, {
      onSuccess: (user) => {
        toast.success(successMessage(user));
        navigate(next, { replace: true });
      },
    });
  };

  const fieldErrors = mutation.error?.fieldErrors ?? {};
  const formError = mutation.error && Object.keys(fieldErrors).length === 0 ? mutation.error.message : null;

  return { form, update, submit, mutation, fieldErrors, formError, next };
}

export function LoginPage() {
  const { user } = useAuth();
  const { form, update, submit, mutation, fieldErrors, formError, next } = useAuthForm(
    { email: "", password: "" },
    api.login,
    (signedIn) => `Welcome back, ${signedIn.name.split(" ")[0]}!`
  );

  if (user && !mutation.isSuccess) return <Navigate to={next} replace />;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to write, like and join the conversation."
      footer={
        <>
          New to SimpleBlog?{" "}
          <Link to={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-700 hover:underline dark:text-brand-400">
            Create an account
          </Link>
        </>
      }
    >
      <title>Sign in · SimpleBlog</title>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={formError} />
        <TextField id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={update("email")} error={fieldErrors.email} required autoFocus />
        <TextField id="password" label="Password" type="password" autoComplete="current-password" value={form.password} onChange={update("password")} error={fieldErrors.password} required />
        <button type="submit" className="btn btn-primary h-11 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-5 rounded-xl bg-stone-100 px-4 py-3 text-center text-xs text-stone-500 dark:bg-stone-800/60">
        Seeded demo account: <span className="font-medium text-stone-700 dark:text-stone-300">demo@simpleblog.dev</span> / password123
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user } = useAuth();
  const { form, update, submit, mutation, fieldErrors, formError, next } = useAuthForm(
    { name: "", username: "", email: "", password: "" },
    api.register,
    (created) => `Welcome to SimpleBlog, ${created.name.split(" ")[0]}!`
  );

  if (user && !mutation.isSuccess) return <Navigate to={next} replace />;

  return (
    <AuthShell
      title="Start writing today"
      subtitle="Create your free account in seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-700 hover:underline dark:text-brand-400">
            Sign in
          </Link>
        </>
      }
    >
      <title>Create account · SimpleBlog</title>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={formError} />
        <TextField id="name" label="Name" autoComplete="name" value={form.name} onChange={update("name")} error={fieldErrors.name} required autoFocus maxLength={60} />
        <TextField
          id="username"
          label="Username"
          autoComplete="username"
          value={form.username}
          onChange={update("username")}
          error={fieldErrors.username}
          required
          maxLength={30}
          placeholder="letters, numbers and _"
        />
        <TextField id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={update("email")} error={fieldErrors.email} required />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          error={fieldErrors.password}
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
        <button type="submit" className="btn btn-brand h-11 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
