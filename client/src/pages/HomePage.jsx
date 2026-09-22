import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Flame, Hash, NotebookPen, PenLine, SearchX, X } from "lucide-react";

import { EmptyState, ErrorState } from "../components/Feedback.jsx";
import { SearchBox } from "../components/Layout.jsx";
import { FeaturedPost, Pagination, PostRow, PostRowSkeleton } from "../components/PostCards.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { cn, postPath } from "../lib/utils.js";

const PAGE_SIZE = 10;

function SortTabs({ sort }) {
  const [params] = useSearchParams();

  const hrefFor = (value) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    if (value === "latest") next.delete("sort");
    else next.set("sort", value);
    const query = next.toString();
    return { search: query ? `?${query}` : "" };
  };

  return (
    <nav className="inline-flex rounded-full bg-stone-200/70 p-1 text-sm dark:bg-stone-800/70" aria-label="Sort stories">
      {[
        ["latest", "Latest"],
        ["popular", "Popular"],
      ].map(([value, label]) => (
        <Link
          key={value}
          to={hrefFor(value)}
          aria-current={sort === value ? "page" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 font-medium transition",
            sort === value
              ? "bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-100"
              : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Sidebar({ activeTag }) {
  const { user } = useAuth();
  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: api.tags });
  const { data: popular } = useQuery({
    queryKey: ["posts", { sort: "popular", limit: 4 }],
    queryFn: ({ signal }) => api.posts({ sort: "popular", limit: 4 }, { signal }),
  });

  return (
    <aside className="space-y-10 lg:sticky lg:top-24 lg:self-start">
      {popular?.posts.length > 0 && (
        <section>
          <h2 className="eyebrow flex items-center gap-2">
            <Flame className="size-3.5" /> Popular right now
          </h2>
          <ol className="mt-4 space-y-4">
            {popular.posts.map((post, index) => (
              <li key={post.id} className="flex gap-4">
                <span className="w-8 shrink-0 font-display text-2xl leading-none font-semibold text-stone-300 tabular-nums dark:text-stone-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <Link
                    to={postPath(post.slug)}
                    className="line-clamp-2 leading-snug font-medium transition hover:text-brand-700 dark:hover:text-brand-400"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-1 text-sm text-stone-500">{post.author.name}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {tags?.length > 0 && (
        <section>
          <h2 className="eyebrow flex items-center gap-2">
            <Hash className="size-3.5" /> Topics
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                to={`/?tag=${encodeURIComponent(tag.name)}`}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition",
                  activeTag === tag.name
                    ? "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-stone-950"
                    : "border-stone-300 text-stone-700 hover:border-brand-400 hover:text-brand-700 dark:border-stone-700 dark:text-stone-300 dark:hover:border-brand-600 dark:hover:text-brand-400"
                )}
              >
                {tag.name} <span className="opacity-60">{tag.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-stone-900 p-6 text-stone-100 dark:bg-stone-100 dark:text-stone-900">
        <NotebookPen className="size-6 text-brand-400 dark:text-brand-600" />
        <h2 className="mt-3 font-display text-xl font-semibold">Have something to say?</h2>
        <p className="mt-2 text-sm text-stone-400 dark:text-stone-600">
          Write in Markdown, save drafts, and publish when it feels right.
        </p>
        <Link
          to={user ? "/write" : "/register"}
          className="btn btn-sm mt-5 bg-white text-stone-900 hover:bg-stone-200 dark:bg-stone-900 dark:text-white dark:hover:bg-stone-700"
        >
          <PenLine /> {user ? "Write a story" : "Start writing"}
        </Link>
      </section>
    </aside>
  );
}

export default function HomePage() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const tag = params.get("tag") ?? "";
  const sort = params.get("sort") === "popular" ? "popular" : "latest";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const filters = { q, tag, sort, page, limit: PAGE_SIZE };
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ["posts", filters],
    queryFn: ({ signal }) => api.posts(filters, { signal }),
    placeholderData: keepPreviousData,
  });

  const isFiltered = Boolean(q || tag);
  const showHero = !isFiltered && sort === "latest" && page === 1;
  const posts = data?.posts ?? [];
  const featured = showHero ? posts[0] : null;
  const list = featured ? posts.slice(1) : posts;

  return (
    <>
      <title>{q ? `Search: ${q} · SimpleBlog` : tag ? `#${tag} · SimpleBlog` : "SimpleBlog — stories worth reading"}</title>

      <div className="container-page">
        {showHero ? (
          <section className="pt-12 pb-10 sm:pt-20 sm:pb-14">
            <p className="eyebrow">The SimpleBlog journal</p>
            <h1 className="mt-4 max-w-4xl font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Ideas worth <em className="font-medium text-brand-600 dark:text-brand-400">slowing down</em> for.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-600 dark:text-stone-400">
              Essays, tutorials and notes from people who build things. Read something good — or start writing your own.
            </p>
            <SearchBox className="mt-8 max-w-md md:hidden" />
          </section>
        ) : (
          <section className="pt-10 pb-8 sm:pt-14">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100">
              <X className="size-4" /> Clear filters
            </Link>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {q ? (
                <>
                  Results for <span className="text-brand-600 dark:text-brand-400">“{q}”</span>
                </>
              ) : tag ? (
                <>
                  <span className="text-brand-600 dark:text-brand-400">#</span>
                  {tag}
                </>
              ) : sort === "popular" ? (
                "Popular stories"
              ) : (
                "All stories"
              )}
            </h1>
            {data && (
              <p className="mt-2 text-stone-500">
                {data.pagination.total} {data.pagination.total === 1 ? "story" : "stories"}
              </p>
            )}
            <SearchBox className="mt-6 max-w-md md:hidden" />
          </section>
        )}

        {featured && <FeaturedPost post={featured} />}

        <div className={cn("grid gap-12 lg:grid-cols-[1fr_300px] lg:gap-16", featured ? "mt-14" : "mt-2")}>
          <section aria-label="Stories">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-stone-800">
              <h2 className="font-display text-2xl font-semibold">{isFiltered ? "Stories" : "Latest stories"}</h2>
              <SortTabs sort={sort} />
            </div>

            {isPending ? (
              Array.from({ length: 4 }, (_, i) => <PostRowSkeleton key={i} />)
            ) : isError ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : posts.length === 0 ? (
              isFiltered ? (
                <EmptyState
                  icon={SearchX}
                  title="No stories found"
                  description="Try a different search or browse a topic from the list."
                  action={
                    <Link to="/" className="btn btn-secondary">
                      See all stories
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  icon={NotebookPen}
                  title="No stories yet"
                  description="Be the first to publish something on SimpleBlog."
                  action={
                    <Link to="/write" className="btn btn-brand">
                      <PenLine /> Write the first story
                    </Link>
                  }
                />
              )
            ) : list.length === 0 ? (
              <p className="py-6 text-stone-500">That's everything for now.</p>
            ) : (
              <div className={cn("divide-y divide-stone-200 transition-opacity dark:divide-stone-800", isPlaceholderData && "opacity-60")}>
                {list.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            )}

            {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} />}
          </section>

          <Sidebar activeTag={tag} />
        </div>
      </div>
    </>
  );
}
