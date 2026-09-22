import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bold,
  Code,
  Eye,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Lock,
  PenLine,
  Quote,
  X,
} from "lucide-react";

import { EmptyState, ErrorState, PageSpinner } from "../components/Feedback.jsx";
import Markdown from "../components/Markdown.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { cn, countWords, editPath, postPath, readingMinutes, timeAgo } from "../lib/utils.js";
import NotFoundPage from "./NotFoundPage.jsx";

const MAX_TAGS = 5;

const normalizeTag = (raw) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{M}\p{N}-]/gu, "")
    .replace(/^-+/, "")
    .slice(0, 24);

function TagInput({ tags, onChange, error }) {
  const [draft, setDraft] = useState("");

  const add = (raw) => {
    const tag = normalizeTag(raw);
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) onChange([...tags, tag]);
    setDraft("");
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2 py-1.5 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 dark:bg-stone-900",
          error ? "border-red-500" : "border-stone-300 dark:border-stone-700"
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-0.5 pr-1 pl-2.5 text-sm font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-200"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="cursor-pointer rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-900"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            id="tags"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => draft && add(draft)}
            placeholder={tags.length ? "Add another…" : "Add up to 5 tags (press Enter)"}
            className="min-w-40 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-stone-400"
          />
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Inserts text through the browser so Ctrl+Z keeps working.
const insertText = (textarea, start, end, text, onChange) => {
  textarea.focus();
  textarea.setSelectionRange(start, end);
  if (!document.execCommand?.("insertText", false, text)) {
    const { value } = textarea;
    onChange(value.slice(0, start) + text + value.slice(end));
  }
};

function MarkdownToolbar({ textareaRef, onChange }) {
  const withSelection = (build) => () => {
    const textarea = textareaRef.current;
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    const { from = start, text, select } = build({ start, end, value, selected: value.slice(start, end) });
    insertText(textarea, from, end, text, onChange);
    requestAnimationFrame(() => textarea.setSelectionRange(from + select[0], from + select[1]));
  };

  const wrap = (before, after, placeholder) =>
    withSelection(({ selected }) => {
      const inner = selected || placeholder;
      return { text: before + inner + after, select: [before.length, before.length + inner.length] };
    });

  const prefixLines = (prefix) =>
    withSelection(({ start, end, value }) => {
      const from = value.lastIndexOf("\n", start - 1) + 1;
      const lines = value.slice(from, end).split("\n");
      const text = lines.map((line, i) => (typeof prefix === "function" ? prefix(i) : prefix) + line).join("\n");
      return { from, text, select: [text.length, text.length] };
    });

  const code = withSelection(({ selected }) => {
    if (selected.includes("\n")) {
      const text = "```\n" + selected + "\n```";
      return { text, select: [4, 4 + selected.length] };
    }
    const inner = selected || "code";
    return { text: "`" + inner + "`", select: [1, 1 + inner.length] };
  });

  const link = withSelection(({ selected }) => {
    const label = selected || "link text";
    const text = `[${label}](https://)`;
    return { text, select: [label.length + 3, label.length + 11] };
  });

  const image = withSelection(({ selected }) => {
    const alt = selected || "Image description";
    const text = `![${alt}](https://)`;
    return { text, select: [alt.length + 4, alt.length + 12] };
  });

  const actions = [
    [Bold, "Bold", wrap("**", "**", "bold text")],
    [Italic, "Italic", wrap("_", "_", "italic text")],
    [Heading2, "Heading", prefixLines("## ")],
    [Quote, "Quote", prefixLines("> ")],
    [Code, "Code", code],
    [LinkIcon, "Link", link],
    [List, "Bulleted list", prefixLines("- ")],
    [ListOrdered, "Numbered list", prefixLines((i) => `${i + 1}. `)],
    [ImagePlus, "Image", image],
  ];

  return (
    <div className="flex flex-wrap gap-0.5" role="toolbar" aria-label="Formatting">
      {actions.map(([Icon, label, onClick]) => (
        <button
          key={label}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
          className="cursor-pointer rounded-lg p-2 text-stone-500 transition hover:bg-stone-200/70 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          aria-label={label}
          title={label}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

function CoverField({ value, onChange, error }) {
  const [broken, setBroken] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setBroken(false);
  }

  return (
    <div>
      {value && !broken ? (
        <div className="group relative overflow-hidden rounded-2xl">
          <img
            src={value}
            alt="Cover preview"
            className="aspect-[2/1] w-full bg-stone-200 object-cover dark:bg-stone-800"
            onError={() => setBroken(true)}
            referrerPolicy="no-referrer"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="btn btn-sm absolute top-3 right-3 bg-white/90 text-stone-800 shadow backdrop-blur hover:bg-white"
          >
            <X /> Remove cover
          </button>
        </div>
      ) : (
        <label htmlFor="cover" className="label flex items-center gap-2">
          <ImagePlus className="size-4 text-stone-400" /> Cover image <span className="font-normal text-stone-400">(optional)</span>
        </label>
      )}
      <input
        id="cover"
        type="url"
        inputMode="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste an image URL — https://…"
        aria-invalid={Boolean(error || broken) || undefined}
        className={cn("input", value && !broken && "mt-3")}
      />
      {(error || broken) && (
        <p className="mt-1.5 text-sm text-red-600">{error ?? "That image couldn't be loaded. Check the URL."}</p>
      )}
    </div>
  );
}

const toForm = (post) => ({
  title: post?.title ?? "",
  // Generated summaries stay empty here so they keep following the content.
  excerpt: post?.customExcerpt ? post.excerpt : "",
  coverImage: post?.coverImage ?? "",
  tags: post?.tags ?? [],
  content: post?.content ?? "",
});

function EditorForm({ post }) {
  const isNew = !post;
  const status = post?.status ?? "draft";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const contentRef = useRef(null);

  const [form, setForm] = useState(() => toForm(post));
  const [savedForm, setSavedForm] = useState(form);
  const [mode, setMode] = useState("write");
  const [errors, setErrors] = useState({});

  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const canSave = form.title.trim().length >= 3 && form.content.trim().length > 0;

  const set = (field) => (value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const save = useMutation({
    mutationFn: ({ snapshot, nextStatus }) => {
      const body = { ...snapshot, status: nextStatus };
      return isNew ? api.createPost(body) : api.updatePost(post.id, body);
    },
    onSuccess: (saved, { snapshot, nextStatus }) => {
      setSavedForm(snapshot);
      setErrors({});
      queryClient.setQueryData(["post", saved.slug], (current) => ({ likedByMe: false, ...current, ...saved }));
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["myPosts"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });

      if (nextStatus === "published") {
        toast.success(status === "published" ? "Changes published" : "Your story is live 🎉");
        navigate(postPath(saved.slug));
        return;
      }

      toast.success(status === "published" ? "Moved back to drafts" : "Draft saved");
      if (isNew || saved.slug !== post.slug) navigate(editPath(saved.slug), { replace: true });
    },
    onError: (error) => {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
    },
  });

  const submit = (nextStatus) => {
    if (!canSave || save.isPending) return;
    save.mutate({ snapshot: form, nextStatus });
  };

  // Ctrl/Cmd + S saves without leaving the page.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        submitRef.current(status === "published" ? "published" : "draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status]);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const words = countWords(form.content);
  const stateLabel = save.isPending
    ? "Saving…"
    : dirty
      ? "Unsaved changes"
      : isNew
        ? "New story"
        : `Saved ${timeAgo(post.updatedAt)}`;

  return (
    <>
      <title>{`${isNew ? "New story" : `Edit: ${post.title}`} · SimpleBlog`}</title>

      <div className="sticky top-16 z-30 border-b border-stone-200/80 bg-stone-50/85 backdrop-blur-lg dark:border-stone-800/80 dark:bg-stone-950/80">
        <div className="container-page flex h-14 max-w-4xl items-center gap-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              status === "published"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
            )}
          >
            {status === "published" ? "Published" : "Draft"}
          </span>
          <span className={cn("hidden text-sm sm:inline", dirty ? "text-amber-600 dark:text-amber-400" : "text-stone-500")}>
            {stateLabel}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-full bg-stone-200/70 p-1 sm:flex dark:bg-stone-800/70">
              {[
                ["write", "Write", PenLine],
                ["preview", "Preview", Eye],
              ].map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition",
                    mode === value
                      ? "bg-white shadow-sm dark:bg-stone-950"
                      : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                  )}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>

            {status === "published" ? (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => submit("draft")} disabled={!canSave || save.isPending}>
                  Unpublish
                </button>
                <button type="button" className="btn btn-brand btn-sm" onClick={() => submit("published")} disabled={!canSave || save.isPending}>
                  Update
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => submit("draft")} disabled={!canSave || save.isPending}>
                  Save draft
                </button>
                <button type="button" className="btn btn-brand btn-sm" onClick={() => submit("published")} disabled={!canSave || save.isPending}>
                  Publish
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container-page max-w-4xl pt-8 pb-16">
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => setMode(mode === "write" ? "preview" : "write")}
            className="btn btn-secondary btn-sm mb-6"
          >
            {mode === "write" ? <Eye /> : <PenLine />} {mode === "write" ? "Preview" : "Back to writing"}
          </button>
        </div>

        {mode === "preview" ? (
          <article className="animate-fade-in">
            {form.coverImage && (
              <img src={form.coverImage} alt="" className="mb-10 aspect-[2/1] w-full rounded-3xl object-cover" referrerPolicy="no-referrer" />
            )}
            <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              {form.title || "Untitled story"}
            </h1>
            {form.excerpt && <p className="mt-4 text-xl text-stone-600 dark:text-stone-400">{form.excerpt}</p>}
            <div className="mt-10">
              {form.content.trim() ? (
                <Markdown>{form.content}</Markdown>
              ) : (
                <p className="text-stone-500 italic">Nothing to preview yet.</p>
              )}
            </div>
          </article>
        ) : (
          <div className="space-y-8">
            <CoverField value={form.coverImage} onChange={set("coverImage")} error={errors.coverImage} />

            <div>
              <label htmlFor="title" className="sr-only">
                Title
              </label>
              <textarea
                id="title"
                value={form.title}
                onChange={(event) => set("title")(event.target.value.replace(/\n/g, " "))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    contentRef.current?.focus();
                  }
                }}
                placeholder="Title"
                rows={1}
                maxLength={150}
                autoFocus={isNew}
                aria-invalid={Boolean(errors.title) || undefined}
                className="w-full resize-none bg-transparent font-display text-4xl leading-tight font-semibold tracking-tight outline-none field-sizing-content placeholder:text-stone-300 sm:text-5xl dark:placeholder:text-stone-700"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}

              <label htmlFor="excerpt" className="sr-only">
                Excerpt
              </label>
              <textarea
                id="excerpt"
                value={form.excerpt}
                onChange={(event) => set("excerpt")(event.target.value)}
                placeholder="Add a short summary (optional — we'll write one from your story)"
                rows={1}
                maxLength={300}
                className="mt-3 w-full resize-none bg-transparent text-xl leading-relaxed text-stone-600 outline-none field-sizing-content placeholder:text-stone-400 dark:text-stone-400 dark:placeholder:text-stone-600"
              />
              {errors.excerpt && <p className="mt-1 text-sm text-red-600">{errors.excerpt}</p>}
            </div>

            <div>
              <label htmlFor="tags" className="label">
                Tags
              </label>
              <TagInput tags={form.tags} onChange={set("tags")} error={errors.tags} />
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/60">
              <div className="flex items-center justify-between gap-2 border-b border-stone-200 px-2 py-1 dark:border-stone-800">
                <MarkdownToolbar textareaRef={contentRef} onChange={set("content")} />
                <a
                  href="https://www.markdownguide.org/cheat-sheet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden shrink-0 pr-2 text-xs text-stone-400 hover:text-stone-700 sm:inline dark:hover:text-stone-200"
                >
                  Markdown supported
                </a>
              </div>
              <label htmlFor="content" className="sr-only">
                Story
              </label>
              <textarea
                id="content"
                ref={contentRef}
                value={form.content}
                onChange={(event) => set("content")(event.target.value)}
                placeholder={"Tell your story…\n\nUse Markdown: **bold**, _italic_, ## headings, `code`, > quotes and more."}
                aria-invalid={Boolean(errors.content) || undefined}
                className="block min-h-[55vh] w-full resize-none bg-transparent px-5 py-4 font-mono text-[15px] leading-7 outline-none field-sizing-content placeholder:text-stone-400 dark:placeholder:text-stone-600"
              />
              <div className="flex items-center justify-between border-t border-stone-200 px-5 py-2.5 text-xs text-stone-500 dark:border-stone-800">
                <span>
                  {words} {words === 1 ? "word" : "words"} · {readingMinutes(form.content)} min read
                </span>
                <span className="hidden sm:inline">Ctrl + S to save</span>
              </div>
            </div>
            {errors.content && <p className="-mt-6 text-sm text-red-600">{errors.content}</p>}

            {!canSave && (form.title || form.content) && (
              <p className="text-sm text-stone-500">Add a title (3+ characters) and some content to save.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function EditorPage() {
  const { slug } = useParams();
  const { user } = useAuth();

  const { data: post, isPending, isError, error, refetch } = useQuery({
    queryKey: ["post", slug],
    queryFn: ({ signal }) => api.post(slug, { signal }),
    enabled: Boolean(slug),
  });

  if (slug) {
    if (isPending) return <PageSpinner />;
    if (isError) {
      if (error.status === 404) return <NotFoundPage />;
      return (
        <div className="container-page max-w-3xl pt-14">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      );
    }
    if (user.id !== post.author.id && user.role !== "admin") {
      return (
        <div className="container-page max-w-2xl pt-16">
          <EmptyState
            icon={Lock}
            title="You can't edit this story"
            description="Only the author can make changes to it."
            action={
              <Link to={postPath(post.slug)} className="btn btn-secondary">
                Back to the story
              </Link>
            }
          />
        </div>
      );
    }
  }

  return <EditorForm key={post?.id ?? "new"} post={post} />;
}
