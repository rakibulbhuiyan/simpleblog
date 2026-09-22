import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Trash } from "lucide-react";

import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { timeAgo } from "../lib/utils.js";
import Avatar from "./Avatar.jsx";
import { Spinner } from "./Feedback.jsx";
import { useToast } from "./Toast.jsx";

const MAX_LENGTH = 2000;

function CommentForm({ post, user }) {
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => api.addComment(post.id, content),
    onSuccess: (comment) => {
      setContent("");
      queryClient.setQueryData(["comments", post.id], (current = []) => [comment, ...current]);
      queryClient.setQueryData(["post", post.slug], (current) => current && { ...current, comments: current.comments + 1 });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = (event) => {
    event.preventDefault();
    if (content.trim()) mutation.mutate();
  };

  return (
    <form onSubmit={submit} className="card flex gap-3 p-4">
      <Avatar user={user} size="sm" className="mt-1" />
      <div className="flex-1">
        <label htmlFor="comment" className="sr-only">
          Add a comment
        </label>
        <textarea
          id="comment"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => (event.metaKey || event.ctrlKey) && event.key === "Enter" && submit(event)}
          placeholder="Share your thoughts…"
          rows={3}
          maxLength={MAX_LENGTH}
          className="w-full resize-y bg-transparent py-1.5 text-[15px] outline-none placeholder:text-stone-400"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-stone-400">
            {content.length > MAX_LENGTH * 0.8 ? `${MAX_LENGTH - content.length} characters left` : "Ctrl + Enter to post"}
          </span>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!content.trim() || mutation.isPending}>
            {mutation.isPending ? "Posting…" : "Post comment"}
          </button>
        </div>
      </div>
    </form>
  );
}

function CommentItem({ comment, canDelete, onDelete, deleting }) {
  return (
    <li className="flex animate-fade-in gap-3 py-5">
      <Link to={`/u/${comment.author.username}`} className="shrink-0">
        <Avatar user={comment.author} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <Link to={`/u/${comment.author.username}`} className="font-medium hover:text-brand-700 dark:hover:text-brand-400">
            {comment.author.name}
          </Link>
          <time dateTime={comment.createdAt} className="text-stone-500" title={new Date(comment.createdAt).toLocaleString()}>
            {timeAgo(comment.createdAt)}
          </time>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="ml-auto cursor-pointer rounded-md p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/50"
              aria-label="Delete comment"
              title="Delete comment"
            >
              <Trash className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 break-words whitespace-pre-wrap text-stone-700 dark:text-stone-300">{comment.content}</p>
      </div>
    </li>
  );
}

export default function Comments({ post }) {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: comments, isPending } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: ({ signal }) => api.comments(post.id, { signal }),
  });

  const remove = useMutation({
    mutationFn: (id) => api.deleteComment(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(["comments", post.id], (current = []) => current.filter((comment) => comment.id !== id));
      queryClient.setQueryData(["post", post.slug], (current) => current && { ...current, comments: current.comments - 1 });
      toast.success("Comment deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const canDelete = (comment) =>
    Boolean(user) && (user.id === comment.author.id || user.id === post.author.id || user.role === "admin");

  return (
    <section id="comments" aria-labelledby="comments-heading" className="scroll-mt-24">
      <h2 id="comments-heading" className="flex items-center gap-2 font-display text-2xl font-semibold">
        Comments <span className="text-stone-400">{post.comments}</span>
      </h2>

      <div className="mt-6">
        {user ? (
          <CommentForm post={post} user={user} />
        ) : (
          <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left">
            <MessageCircle className="size-6 text-brand-600 dark:text-brand-400" />
            <p className="flex-1 text-stone-600 dark:text-stone-400">Join the conversation — sign in to leave a comment.</p>
            <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="btn btn-primary btn-sm">
              Sign in
            </Link>
          </div>
        )}
      </div>

      {isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-10 text-center text-stone-500">No comments yet. Start the conversation!</p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-200 dark:divide-stone-800">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={canDelete(comment)}
              deleting={remove.isPending && remove.variables === comment.id}
              onDelete={() => remove.mutate(comment.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
