import { Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { LayoutDashboard, LogOut, Moon, PenLine, Rss, Search, Settings, Sun, User } from "lucide-react";

import { useAuth, useLogout } from "../hooks/useAuth.js";
import { useTheme } from "../hooks/useTheme.js";
import { cn } from "../lib/utils.js";
import Avatar from "./Avatar.jsx";
import { PageSpinner } from "./Feedback.jsx";
import { useToast } from "./Toast.jsx";

export function Logo({ className }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)} aria-label="SimpleBlog home">
      <span className="flex size-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-700/30 transition group-hover:rotate-[-6deg] dark:bg-brand-500 dark:text-stone-950">
        <PenLine className="size-4" strokeWidth={2.5} />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">
        Simple<span className="text-brand-600 dark:text-brand-400">Blog</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button type="button" onClick={toggle} className="btn btn-ghost btn-icon" aria-label={label} title={label}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}

export function SearchBox({ className, autoFocus = false }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const current = params.get("q") ?? "";
  const [value, setValue] = useState(current);
  const [lastCurrent, setLastCurrent] = useState(current);

  // Keep the input in sync when the URL changes (e.g. "clear search").
  if (current !== lastCurrent) {
    setLastCurrent(current);
    setValue(current);
  }

  const submit = (event) => {
    event.preventDefault();
    const q = value.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  return (
    <form onSubmit={submit} role="search" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search stories…"
        aria-label="Search stories"
        autoFocus={autoFocus}
        className="h-10 w-full rounded-full border border-stone-200 bg-white/70 pr-4 pl-10 text-sm transition outline-none placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 dark:border-stone-800 dark:bg-stone-900/70 dark:focus:bg-stone-900"
      />
    </form>
  );
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const logout = useLogout();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => !ref.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success("You've been signed out.");
        navigate("/");
      },
      onError: (error) => toast.error(error.message),
    });

  const item =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 [&_svg]:size-4 [&_svg]:text-stone-400";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer rounded-full transition hover:opacity-85"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar user={user} size="sm" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 origin-top-right animate-fade-in rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-900/10 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/40"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-sm text-stone-500">@{user.username}</p>
          </div>
          <div className="my-1 h-px bg-stone-200 dark:bg-stone-800" />
          <Link role="menuitem" to="/write" className={cn(item, "sm:hidden")}>
            <PenLine /> Write a story
          </Link>
          <Link role="menuitem" to={`/u/${user.username}`} className={item}>
            <User /> Your profile
          </Link>
          <Link role="menuitem" to="/dashboard" className={item}>
            <LayoutDashboard /> Dashboard
          </Link>
          <Link role="menuitem" to="/settings" className={item}>
            <Settings /> Settings
          </Link>
          <div className="my-1 h-px bg-stone-200 dark:bg-stone-800" />
          <button type="button" role="menuitem" onClick={signOut} className={cn(item, "cursor-pointer")}>
            <LogOut /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/80 backdrop-blur-lg dark:border-stone-800/80 dark:bg-stone-950/75">
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />
        <SearchBox className="ml-6 hidden w-full max-w-xs md:block" />

        <nav className="ml-auto flex items-center gap-1.5" aria-label="Main">
          <ThemeToggle />
          {isLoading ? (
            <span className="size-8 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800" />
          ) : user ? (
            <>
              <NavLink to="/write" className="btn btn-primary mr-1.5 hidden sm:inline-flex">
                <PenLine /> Write
              </NavLink>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary sm:hidden">
                Sign in
              </Link>
              <Link to="/login" className="btn btn-ghost hidden sm:inline-flex">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary hidden sm:inline-flex">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-stone-200 dark:border-stone-800">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-stone-500">
            Stories, ideas and notes worth reading. Built with Express, PostgreSQL, Prisma and React.
          </p>
        </div>
        <div className="flex items-center gap-5 text-sm text-stone-500">
          <a href="/rss.xml" className="inline-flex items-center gap-1.5 hover:text-brand-700 dark:hover:text-brand-400">
            <Rss className="size-4" /> RSS
          </a>
          <span>© {new Date().getFullYear()} SimpleBlog</span>
        </div>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  // Block body on purpose: newer browsers return a Promise from scrollTo(),
  // which React would otherwise treat as the effect's cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-stone-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
