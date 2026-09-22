import { Link, useParams, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, NotebookPen, Settings } from "lucide-react";

import Avatar from "../components/Avatar.jsx";
import { EmptyState, ErrorState, PageSpinner } from "../components/Feedback.jsx";
import { Pagination, PostRow, PostRowSkeleton } from "../components/PostCards.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { formatMonthYear, formatNumber } from "../lib/utils.js";
import NotFoundPage from "./NotFoundPage.jsx";

const PAGE_SIZE = 10;

export default function ProfilePage() {
  const { username } = useParams();
  const [params] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const { user: me } = useAuth();

  const profile = useQuery({
    queryKey: ["user", username],
    queryFn: ({ signal }) => api.user(username, { signal }),
  });

  const filters = { author: username, page, limit: PAGE_SIZE };
  const posts = useQuery({
    queryKey: ["posts", filters],
    queryFn: ({ signal }) => api.posts(filters, { signal }),
    placeholderData: keepPreviousData,
    enabled: profile.isSuccess,
  });

  if (profile.isPending) return <PageSpinner />;
  if (profile.isError) {
    if (profile.error.status === 404) return <NotFoundPage message="We couldn't find that writer." />;
    return (
      <div className="container-page max-w-3xl pt-14">
        <ErrorState error={profile.error} onRetry={profile.refetch} />
      </div>
    );
  }

  const { user, stats } = profile.data;
  const isMe = me?.id === user.id;

  return (
    <div className="container-page max-w-3xl pt-12 sm:pt-16">
      <title>{`${user.name} (@${user.username}) · SimpleBlog`}</title>

      <header className="flex flex-col items-center text-center">
        <Avatar user={user} size="xl" className="ring-4" />
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">{user.name}</h1>
        <p className="mt-1 text-stone-500">@{user.username}</p>
        {user.bio && <p className="mt-4 max-w-lg text-lg text-pretty text-stone-600 dark:text-stone-400">{user.bio}</p>}
        <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-stone-500">
          <CalendarDays className="size-4" /> Joined {formatMonthYear(user.createdAt)}
        </p>

        <dl className="mt-8 grid w-full max-w-md grid-cols-3 divide-x divide-stone-200 rounded-2xl border border-stone-200 bg-white py-4 dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900/60">
          {[
            ["Stories", stats.posts],
            ["Views", stats.views],
            ["Likes", stats.likes],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>

        {isMe && (
          <Link to="/settings" className="btn btn-secondary btn-sm mt-6">
            <Settings /> Edit profile
          </Link>
        )}
      </header>

      <section className="mt-14" aria-label={`Stories by ${user.name}`}>
        <h2 className="mb-6 border-b border-stone-200 pb-4 font-display text-2xl font-semibold dark:border-stone-800">Stories</h2>
        {posts.isPending ? (
          Array.from({ length: 3 }, (_, i) => <PostRowSkeleton key={i} />)
        ) : posts.isError ? (
          <ErrorState error={posts.error} onRetry={posts.refetch} />
        ) : posts.data.posts.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No stories yet"
            description={isMe ? "Your published stories will appear here." : `${user.name} hasn't published anything yet.`}
            action={
              isMe && (
                <Link to="/write" className="btn btn-brand">
                  Write your first story
                </Link>
              )
            }
          />
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {posts.data.posts.map((post) => (
              <PostRow key={post.id} post={post} showAuthor={false} />
            ))}
          </div>
        )}
        {posts.data && <Pagination page={posts.data.pagination.page} totalPages={posts.data.pagination.totalPages} />}
      </section>
    </div>
  );
}
