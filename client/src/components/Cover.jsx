import { useState } from "react";

import { cn, gradientFor } from "../lib/utils.js";

// Post cover image with a generated gradient fallback when there is no image
// (or it fails to load).
export default function Cover({ post, className, eager = false }) {
  const [failed, setFailed] = useState(false);

  if (post.coverImage && !failed) {
    return (
      <img
        src={post.coverImage}
        alt=""
        className={cn("size-full bg-stone-200 object-cover dark:bg-stone-800", className)}
        loading={eager ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn("relative flex size-full items-end overflow-hidden", className)}
      style={{ backgroundImage: gradientFor(post.slug ?? post.title) }}
      aria-hidden="true"
    >
      <span className="absolute -right-2 -bottom-10 font-display text-[9rem] leading-none font-semibold text-white/25 italic">
        {post.title?.trim()[0] ?? "S"}
      </span>
    </div>
  );
}
