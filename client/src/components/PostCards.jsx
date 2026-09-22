import { Link, useSearchParams } from "react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";

import { cn, formatDate, formatNumber, postPath } from "../lib/utils.js";
import Avatar from "./Avatar.jsx";
import Cover from "./Cover.jsx";

export function TagChip({ tag }) {
  return (
    <Link to={`/?tag=${encodeURIComponent(tag)}`} className="chip">
      #{tag}
    </Link>
  );
}

export function AuthorLine({ post, size = "xs" }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <Avatar user={post.author} size={size} />
      <Link
        to={`/u/${post.author.username}`}
        className="truncate font-medium text-stone-800 hover:text-brand-700 dark:text-stone-200 dark:hover:text-brand-400"
      >
        {post.author.name}
      </Link>
    </div>
  );
}

function Stats({ post, className }) {
  return (
    <div className={cn("flex items-center gap-3.5 text-sm text-stone-500 [&_svg]:size-4", className)}>
      <span className="inline-flex items-center gap-1" title={`${post.likes} likes`}>
        <Heart /> {formatNumber(post.likes)}
      </span>
      <span className="inline-flex items-center gap-1" title={`${post.comments} comments`}>
        <MessageCircle /> {formatNumber(post.comments)}
      </span>
    </div>
  );
}

export function FeaturedPost({ post }) {
  return (
    <article className="group grid animate-fade-in overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm shadow-stone-900/[0.03] transition hover:shadow-xl hover:shadow-stone-900/[0.06] lg:grid-cols-[1.25fr_1fr] dark:border-stone-800 dark:bg-stone-900/60 dark:shadow-none">
      <Link to={postPath(post.slug)} className="relative block aspect-[16/9] overflow-hidden lg:aspect-auto lg:min-h-[400px]" tabIndex={-1}>
        <Cover post={post} eager className="absolute inset-0 transition duration-700 group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-col p-6 sm:p-8 lg:p-10">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
            Featured
          </span>
          <span className="text-sm text-stone-500">{formatDate(post.publishedAt)}</span>
        </div>
        <h2 className="mt-4 font-display text-3xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-4xl">
          <Link to={postPath(post.slug)} className="transition hover:text-brand-700 dark:hover:text-brand-400">
            {post.title}
          </Link>
        </h2>
        <p className="mt-4 line-clamp-3 text-lg leading-relaxed text-stone-600 dark:text-stone-400">{post.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
          <AuthorLine post={post} size="sm" />
          <Link to={postPath(post.slug)} className="btn btn-secondary btn-sm group/link">
            Read story <ArrowRight className="transition group-hover/link:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PostRow({ post, showAuthor = true }) {
  return (
    <article className="group grid animate-fade-in grid-cols-[1fr_auto] gap-5 py-7 first:pt-0 sm:gap-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          {showAuthor && (
            <>
              <AuthorLine post={post} />
              <span aria-hidden="true">·</span>
            </>
          )}
          <time dateTime={post.publishedAt} className="shrink-0">
            {formatDate(post.publishedAt)}
          </time>
        </div>
        <h3 className="mt-2.5 font-display text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">
          <Link to={postPath(post.slug)} className="transition hover:text-brand-700 dark:hover:text-brand-400">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-stone-600 dark:text-stone-400">{post.excerpt}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm text-stone-500">{post.readingTime} min read</span>
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
          <Stats post={post} className="ml-auto" />
        </div>
      </div>
      <Link
        to={postPath(post.slug)}
        tabIndex={-1}
        aria-hidden="true"
        className="relative mt-1 block aspect-square w-24 overflow-hidden rounded-2xl sm:aspect-[4/3] sm:w-44"
      >
        <Cover post={post} className="absolute inset-0 transition duration-500 group-hover:scale-105" />
      </Link>
    </article>
  );
}

export function PostRowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-5 py-7 first:pt-0 sm:gap-8" aria-hidden="true">
      <div>
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-4 h-6 w-4/5" />
        <div className="skeleton mt-3 h-4 w-full" />
        <div className="skeleton mt-2 h-4 w-2/3" />
      </div>
      <div className="skeleton aspect-square w-24 rounded-2xl sm:aspect-[4/3] sm:w-44" />
    </div>
  );
}

const pageWindow = (page, total) => {
  const pages = new Set([1, total, page - 1, page, page + 1]);
  return [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
};

export function Pagination({ page, totalPages }) {
  const [params] = useSearchParams();
  if (totalPages <= 1) return null;

  const hrefFor = (n) => {
    const next = new URLSearchParams(params);
    if (n === 1) next.delete("page");
    else next.set("page", String(n));
    const query = next.toString();
    return { search: query ? `?${query}` : "" };
  };

  const base = "btn btn-sm min-w-8 px-2.5";
  let previous = 0;

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        to={hrefFor(page - 1)}
        className={cn(base, "btn-ghost", page <= 1 && "pointer-events-none opacity-40")}
        aria-disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </Link>
      {pageWindow(page, totalPages).map((n) => {
        const gap = n - previous > 1;
        previous = n;
        return (
          <span key={n} className="flex items-center gap-1">
            {gap && <span className="px-1 text-stone-400">…</span>}
            <Link
              to={hrefFor(n)}
              className={cn(base, n === page ? "btn-primary" : "btn-ghost")}
              aria-current={n === page ? "page" : undefined}
            >
              {n}
            </Link>
          </span>
        );
      })}
      <Link
        to={hrefFor(page + 1)}
        className={cn(base, "btn-ghost", page >= totalPages && "pointer-events-none opacity-40")}
        aria-disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight />
      </Link>
    </nav>
  );
}
