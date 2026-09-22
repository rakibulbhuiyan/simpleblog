import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Avatar from "../components/Avatar.jsx";
import { useToast } from "../components/Toast.jsx";
import { ME_KEY, useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : hint && <p className="mt-1.5 text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

function ProfileForm({ user }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, bio: user.bio ?? "", avatar: user.avatar ?? "" });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: () => api.updateProfile(form),
    onSuccess: (updated) => {
      queryClient.setQueryData(ME_KEY, updated);
      queryClient.invalidateQueries({ queryKey: ["user", updated.username] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setErrors({});
      toast.success("Profile updated");
    },
    onError: (error) => {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
    },
  });

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <form
      className="card space-y-6 p-6 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <h2 className="font-display text-xl font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-stone-500">This is how readers see you on your stories and profile page.</p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar user={{ ...user, ...form }} size="lg" key={form.avatar} />
        <div className="text-sm">
          <p className="font-medium">@{user.username}</p>
          <Link to={`/u/${user.username}`} className="text-brand-700 hover:underline dark:text-brand-400">
            View public profile
          </Link>
        </div>
      </div>

      <Field id="name" label="Display name" error={errors.name}>
        <input id="name" className="input" value={form.name} onChange={update("name")} maxLength={60} required aria-invalid={Boolean(errors.name) || undefined} />
      </Field>

      <Field id="bio" label="Bio" hint={`${280 - form.bio.length} characters left`} error={errors.bio}>
        <textarea id="bio" className="input min-h-24 resize-y" value={form.bio} onChange={update("bio")} maxLength={280} placeholder="A sentence or two about you" />
      </Field>

      <Field id="avatar" label="Avatar URL" hint="Link to a square image. Leave empty to use your initials." error={errors.avatar}>
        <input id="avatar" type="url" className="input" value={form.avatar} onChange={update("avatar")} placeholder="https://…" aria-invalid={Boolean(errors.avatar) || undefined} />
      </Field>

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const empty = { currentPassword: "", newPassword: "" };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: () => api.changePassword(form),
    onSuccess: () => {
      setForm(empty);
      setErrors({});
      toast.success("Password changed");
    },
    onError: (error) => {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
    },
  });

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <form
      className="card space-y-6 p-6 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <h2 className="font-display text-xl font-semibold">Password</h2>
        <p className="mt-1 text-sm text-stone-500">Use at least 8 characters.</p>
      </div>

      <Field id="currentPassword" label="Current password" error={errors.currentPassword}>
        <input id="currentPassword" type="password" autoComplete="current-password" className="input" value={form.currentPassword} onChange={update("currentPassword")} required aria-invalid={Boolean(errors.currentPassword) || undefined} />
      </Field>

      <Field id="newPassword" label="New password" error={errors.newPassword}>
        <input id="newPassword" type="password" autoComplete="new-password" minLength={8} className="input" value={form.newPassword} onChange={update("newPassword")} required aria-invalid={Boolean(errors.newPassword) || undefined} />
      </Field>

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="container-page max-w-2xl pt-10 sm:pt-14">
      <title>Settings · SimpleBlog</title>
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-2 text-stone-500">Signed in as {user.email}</p>

      <div className="mt-10 space-y-8">
        <ProfileForm user={user} />
        <PasswordForm />
      </div>
    </div>
  );
}
