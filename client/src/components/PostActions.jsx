import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { Heart, Share2 } from "lucide-react";

import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { cn, formatNumber } from "../lib/utils.js";
import { useToast } from "./Toast.jsx";

export function LikeButton({ post, size = "md" }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const key = ["post", post.slug];

  const mutation = useMutation({
    mutationFn: (liked) => (liked ? api.unlike(post.id) : api.like(post.id)),
    // Optimistic update: the heart reacts instantly, rolls back on failure.
    onMutate: async (liked) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (current) =>
        current && { ...current, likedByMe: !liked, likes: current.likes + (liked ? -1 : 1) }
      );
      return { previous };
    },
    onError: (error, _liked, context) => {
      queryClient.setQueryData(key, context.previous);
      toast.error(error.message);
    },
    onSuccess: ({ liked, likes }) => {
      queryClient.setQueryData(key, (current) => current && { ...current, likedByMe: liked, likes });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const onClick = () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    mutation.mutate(post.likedByMe);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={post.likedByMe}
      aria-label={post.likedByMe ? "Unlike this post" : "Like this post"}
      className={cn(
        "btn",
        size === "lg" ? "h-12 px-6 text-base [&_svg]:size-5" : "btn-sm",
        post.likedByMe
          ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-900"
          : "btn-secondary"
      )}
    >
      <Heart key={String(post.likedByMe)} className={cn(post.likedByMe && "animate-pop fill-current")} />
      {formatNumber(post.likes)}
    </button>
  );
}

export function ShareButton({ post, className }) {
  const toast = useToast();

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.excerpt, url });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <button type="button" onClick={share} className={cn("btn btn-secondary btn-sm", className)} aria-label="Share this post">
      <Share2 /> Share
    </button>
  );
}
