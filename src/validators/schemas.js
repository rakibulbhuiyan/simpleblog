const { z } = require("zod");

const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

// "" or null clears the field; anything else must be an http(s) URL.
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || isHttpUrl(value), "Must be a valid http(s) URL")
  .transform((value) => value || null)
  .nullable()
  .optional();

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254));

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-z0-9_]+$/, "Use only letters, numbers and underscores");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

const name = z.string().trim().min(1, "Name is required").max(60, "Name must be at most 60 characters");

const registerSchema = z.object({ name, username, email, password });

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const profileSchema = z.object({
  name: name.optional(),
  bio: z
    .string()
    .trim()
    .max(280, "Bio must be at most 280 characters")
    .transform((value) => value || null)
    .nullable()
    .optional(),
  avatar: optionalUrl,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

const tag = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(24, "Tags must be at most 24 characters")
  .regex(/^[\p{L}\p{N}][\p{L}\p{M}\p{N}-]*$/u, "Tags can contain letters, numbers and dashes");

const postFields = {
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title must be at most 150 characters"),
  content: z
    .string()
    .max(100_000, "Content is too long")
    .refine((value) => value.trim().length > 0, "Write something before saving"),
  excerpt: z.string().trim().max(300, "Excerpt must be at most 300 characters").optional(),
  coverImage: optionalUrl,
  tags: z
    .array(tag)
    .max(5, "Use up to 5 tags")
    .transform((tags) => [...new Set(tags)])
    .optional(),
  status: z.enum(["draft", "published"]).optional(),
};

const createPostSchema = z.object(postFields);
const updatePostSchema = z.object(postFields).partial();

const listPostsQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().toLowerCase().max(24).optional(),
  author: z.string().trim().toLowerCase().max(30).optional(),
  sort: z.enum(["latest", "popular"]).default("latest"),
});

const myPostsQuery = z.object({
  status: z.enum(["all", "draft", "published"]).default("all"),
});

const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters"),
});

const uuid = z.uuid();

module.exports = {
  registerSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
  createPostSchema,
  updatePostSchema,
  listPostsQuery,
  myPostsQuery,
  commentSchema,
  uuid,
};
