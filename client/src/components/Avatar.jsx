import { useState } from "react";

import { cn, gradientFor, initials } from "../lib/utils.js";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-24 text-3xl",
};

export default function Avatar({ user, size = "md", className }) {
  const [failed, setFailed] = useState(false);
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white select-none dark:ring-stone-900",
    SIZES[size],
    className
  );

  if (user?.avatar && !failed) {
    return (
      <img
        src={user.avatar}
        alt=""
        className={cn(classes, "object-cover")}
        onError={() => setFailed(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={cn(classes, "font-semibold text-white")}
      style={{ backgroundImage: gradientFor(user?.username ?? "") }}
      aria-hidden="true"
    >
      {initials(user?.name)}
    </span>
  );
}
