const crypto = require("node:crypto");

// Unicode-aware: keeps letters/marks/numbers of any script (e.g. Bangla titles),
// strips Latin accents, and collapses everything else into dashes.
const slugify = (text) => {
  const slug = String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "post";
};

const randomSuffix = () => crypto.randomBytes(3).toString("hex");

const stripMarkdown = (markdown, { dropHeadings = false } = {}) => {
  let text = String(markdown).replace(/```[\s\S]*?```/g, " "); // fenced code blocks

  // Headings read oddly in the middle of a summary.
  if (dropHeadings) text = text.replace(/^\s{0,3}#{1,6}\s+.*$/gm, " ");

  return text
    .replace(/<[^>]+>/g, " ") // html tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "") // headings, quotes, lists
    .replace(/^\s*([-*_]\s*){3,}$/gm, " ") // horizontal rules
    .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, "$2") // emphasis
    .replace(/\s+/g, " ")
    .trim();
};

const makeExcerpt = (markdown, maxLength = 200) => {
  const text = stripMarkdown(markdown, { dropHeadings: true }) || stripMarkdown(markdown);
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

const WORDS_PER_MINUTE = 220;

const readingTime = (markdown) => {
  const words = String(markdown).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

module.exports = { slugify, randomSuffix, makeExcerpt, readingTime };
