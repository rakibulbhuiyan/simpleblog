import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { cn } from "../lib/utils.js";

const isExternal = (href = "") => /^https?:\/\//.test(href) && !href.startsWith(window.location.origin);

// Raw HTML is not rendered and unsafe URLs are stripped by react-markdown,
// so user-written posts can't inject scripts.
const components = {
  a: ({ node, href, ...props }) => (
    <a href={href} {...(isExternal(href) && { target: "_blank", rel: "noopener noreferrer" })} {...props} />
  ),
  img: ({ node, alt, ...props }) => <img alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" {...props} />,
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

export default function Markdown({ children, className }) {
  return (
    <div className={cn("article", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
