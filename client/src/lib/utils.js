export const cn = (...classes) => classes.filter(Boolean).join(" ");

const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
const monthYear = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : "");
export const formatMonthYear = (value) => (value ? monthYear.format(new Date(value)) : "");
export const formatNumber = (value) => compact.format(value ?? 0);

const UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export const timeAgo = (value) => {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
};

export const hashString = (text = "") => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
};

// Deterministic, pleasant gradient for posts without a cover image.
export const gradientFor = (seed) => {
  const hue = hashString(seed) % 360;
  return `linear-gradient(135deg, oklch(0.78 0.11 ${hue}) 0%, oklch(0.6 0.15 ${(hue + 40) % 360}) 55%, oklch(0.42 0.12 ${(hue + 80) % 360}) 100%)`;
};

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

export const countWords = (text = "") => text.trim().split(/\s+/).filter(Boolean).length;

// Mirrors the server's calculation in src/utils/content.js.
export const readingMinutes = (text = "") => Math.max(1, Math.ceil(countWords(text) / 220));

// Only allow same-site relative redirects (avoids open-redirects via ?next=).
export const safeNext = (value) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/");

export const postPath = (slug) => `/post/${encodeURIComponent(slug)}`;
export const editPath = (slug) => `/edit/${encodeURIComponent(slug)}`;
