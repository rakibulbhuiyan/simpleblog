import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, Heart, MessageCircle, NotebookPen, Pencil, PenLine, Send, Trash } from "lucide-react";

import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { EmptyState, ErrorState } from "../components/Feedback.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { cn, editPath, formatNumber, postPath, timeAgo } from "../lib/utils.js";

const TABS = [
  ["all", "All"],
  ["published", "Published"],
  ["draft", "Drafts"],
];

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Icon className="size-4" /> {label}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{formatNumber(value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState("all");
  const [toDelete, setToDelete] = useState(null);

  const { data: posts, isPending, isError, error, refetch } = useQuery({
    queryKey: ["myPosts"],
    queryFn: api.myPosts,
  });

  const remove = useMutation({
    mutationFn: (post) => api.deletePost(post.id),
    onSuccess: (_data, post) => {
      queryClient.setQueryData(["myPosts"], (current = []) => current.filter((item) => item.id !== post.id));
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setToDelete(null);
      toast.success("Post deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const all = posts ?? [];
  const published = all.filter((post) => post.status === "published");
  const visible = tab === "all" ? all : all.filter((post) => post.status === tab);
  const totals = published.reduce(
    (sum, post) => ({ views: sum.views + post.views, likes: sum.likes + post.likes, comments: sum.comments + post.comments }),
    { views: 0, likes: 0, comments: 0 }
  );

  return (
    <div className="container-page max-w-5xl pt-10 sm:pt-14">
      <title>Dashboard · SimpleBlog</title>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
        </div>
        <Link to="/write" className="btn btn-brand">
          <PenLine /> New story
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Send} label="Published" value={published.length} />
        <StatTile icon={Eye} label="Total views" value={totals.views} />
        <StatTile icon={Heart} label="Total likes" value={totals.likes} />
        <StatTile icon={MessageCircle} label="Comments" value={totals.comments} />
      </div>

      <div className="mt-12 flex items-center gap-1 border-b border-stone-200 dark:border-stone-800" role="tablist">
        {TABS.map(([value, label]) => {
          const count = value === "all" ? all.length : all.filter((post) => post.status === value).length;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "-mb-px cursor-pointer border-b-2 px-4 py-3 text-sm font-medium transition",
                tab === value
                  ? "border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100"
                  : "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
              )}
            >
              {label} <span className="ml-1 text-stone-400">{count}</span>
            </button>
          );
        })}
      </div>

      {isPending ? (
        <div className="divide-y divide-stone-200 dark:divide-stone-800">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="py-5">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton mt-3 h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="mt-8">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={tab === "draft" ? FileText : NotebookPen}
          title={tab === "draft" ? "No drafts" : tab === "published" ? "Nothing published yet" : "You haven't written anything yet"}
          description="Every great blog starts with a single story."
          action={
            <Link to="/write" className="btn btn-brand">
              <PenLine /> Write a story
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {visible.map((post) => (
            <li key={post.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
                      post.status === "published"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    )}
                  >
                    {post.status}
                  </span>
                  <Link
                    to={post.status === "published" ? postPath(post.slug) : editPath(post.slug)}
                    className="truncate font-display text-lg font-semibold hover:text-brand-700 dark:hover:text-brand-400"
                  >
                    {post.title}
                  </Link>
                </div>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500 [&_svg]:size-3.5">
                  <span>Updated {timeAgo(post.updatedAt)}</span>
                  {post.status === "published" && (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <Eye /> {formatNumber(post.views)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart /> {formatNumber(post.likes)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle /> {formatNumber(post.comments)}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link to={editPath(post.slug)} className="btn btn-secondary btn-sm">
                  <Pencil /> Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setToDelete(post)}
                  className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                  aria-label={`Delete ${post.title}`}
                >
                  <Trash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this story?"
        description={toDelete ? `“${toDelete.title}” will be permanently deleted along with its likes and comments.` : ""}
        confirmLabel="Delete story"
        pending={remove.isPending}
        onConfirm={() => remove.mutate(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
