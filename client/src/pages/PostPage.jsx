import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Eye, FilePen, Pencil, Trash } from "lucide-react";

import Avatar from "../components/Avatar.jsx";
import Comments from "../components/Comments.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { ErrorState } from "../components/Feedback.jsx";
import Markdown from "../components/Markdown.jsx";
import { LikeButton, ShareButton } from "../components/PostActions.jsx";
import { TagChip } from "../components/PostCards.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { editPath, formatDate, formatNumber } from "../lib/utils.js";
import NotFoundPage from "./NotFoundPage.jsx";

function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-brand-500 transition-transform duration-150"
      style={{ transform: `scaleX(${progress})` }}
      aria-hidden="true"
    />
  );
}

function PostSkeleton() {
  return (
    <div className="container-page max-w-3xl pt-14" aria-hidden="true">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton mt-6 h-12 w-full" />
      <div className="skeleton mt-3 h-12 w-2/3" />
      <div className="mt-8 flex items-center gap-3">
        <div className="skeleton size-11 rounded-full" />
        <div className="skeleton h-4 w-48" />
      </div>
      <div className="skeleton mt-10 aspect-[2/1] w-full rounded-3xl" />
    </div>
  );
}

export default function PostPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const { data: post, isPending, isError, error, refetch } = useQuery({
    queryKey: ["post", slug],
    queryFn: ({ signal }) => api.post(slug, { signal }),
  });

  const remove = useMutation({
    mutationFn: () => api.deletePost(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["myPosts"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Post deleted");
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isPending) return <PostSkeleton />;
  if (isError) {
    if (error.status === 404) return <NotFoundPage message="This story doesn't exist, or it hasn't been published yet." />;
    return (
      <div className="container-page max-w-3xl pt-14">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const canManage = user && (user.id === post.author.id || user.role === "admin");
  const isDraft = post.status === "draft";

  return (
    <>
      <title>{`${post.title} · SimpleBlog`}</title>
      <meta name="description" content={post.excerpt} />
      <ReadingProgress />

      <article className="pb-8">
        {isDraft && (
          <div className="border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span className="flex items-center gap-2">
                <FilePen className="size-4" /> This is a draft — only you can see it.
              </span>
              <Link to={editPath(post.slug)} className="font-medium underline underline-offset-4">
                Continue editing
              </Link>
            </div>
          </div>
        )}

        <header className="container-page max-w-3xl pt-10 sm:pt-14">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition hover:text-stone-900 dark:hover:text-stone-100">
            <ArrowLeft className="size-4" /> All stories
          </Link>

          {post.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          )}

          <h1 className="mt-4 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
            {post.title}
          </h1>
          {/* Auto-generated excerpts repeat the opening paragraph, so only show the author's own. */}
          {post.customExcerpt && (
            <p className="mt-5 text-xl leading-relaxed text-pretty text-stone-600 dark:text-stone-400">{post.excerpt}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-stone-200 py-4 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <Link to={`/u/${post.author.username}`}>
                <Avatar user={post.author} size="md" />
              </Link>
              <div>
                <Link to={`/u/${post.author.username}`} className="font-medium hover:text-brand-700 dark:hover:text-brand-400">
                  {post.author.name}
                </Link>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-stone-500">
                  <time dateTime={post.publishedAt ?? post.createdAt}>{formatDate(post.publishedAt ?? post.createdAt)}</time>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {post.readingTime} min read
                  </span>
                  {!isDraft && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" /> {formatNumber(post.views)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isDraft && <LikeButton post={post} />}
              {!isDraft && <ShareButton post={post} />}
              {canManage && (
                <>
                  <Link to={editPath(post.slug)} className="btn btn-secondary btn-sm" aria-label="Edit post">
                    <Pencil /> <span className="hidden sm:inline">Edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                    aria-label="Delete post"
                  >
                    <Trash />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {post.coverImage && (
          <figure className="container-page mt-10 max-w-5xl">
            <img
              src={post.coverImage}
              alt=""
              className="aspect-[2/1] w-full rounded-3xl bg-stone-200 object-cover dark:bg-stone-800"
              referrerPolicy="no-referrer"
            />
          </figure>
        )}

        <div className="container-page mt-10 max-w-3xl">
          <Markdown>{post.content}</Markdown>

          {!isDraft && (
            <>
              <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-8 dark:border-stone-800">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <LikeButton post={post} size="lg" />
                  <ShareButton post={post} className="h-12 px-5 text-base" />
                </div>
              </div>

              <aside className="card mt-10 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
                <Avatar user={post.author} size="lg" />
                <div className="flex-1">
                  <p className="eyebrow">Written by</p>
                  <Link
                    to={`/u/${post.author.username}`}
                    className="mt-1 block font-display text-xl font-semibold hover:text-brand-700 dark:hover:text-brand-400"
                  >
                    {post.author.name}
                  </Link>
                  {post.author.bio && <p className="mt-1 text-stone-600 dark:text-stone-400">{post.author.bio}</p>}
                </div>
                <Link to={`/u/${post.author.username}`} className="btn btn-secondary btn-sm self-start sm:self-center">
                  More stories
                </Link>
              </aside>

              <div className="mt-16">
                <Comments post={post} />
              </div>
            </>
          )}
        </div>
      </article>

      <ConfirmDialog
        open={confirming}
        title="Delete this story?"
        description="This permanently removes the post along with its likes and comments. This can't be undone."
        confirmLabel="Delete story"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
