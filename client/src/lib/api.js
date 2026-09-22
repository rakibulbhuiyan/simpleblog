export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details ?? [];
  }

  // { field: message } map for highlighting form inputs.
  get fieldErrors() {
    return Object.fromEntries(this.details.map((detail) => [detail.field, detail.message]));
  }
}

const request = async (path, { method = "GET", body, signal } = {}) => {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status, data?.details);
  }

  return data;
};

const toQuery = (params = {}) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ).toString();
  return search ? `?${search}` : "";
};

const slugPath = (slug) => encodeURIComponent(slug);

export const api = {
  // auth
  me: ({ signal }) => request("/auth/me", { signal }).then((data) => data.user),
  register: (body) => request("/auth/register", { method: "POST", body }).then((data) => data.user),
  login: (body) => request("/auth/login", { method: "POST", body }).then((data) => data.user),
  logout: () => request("/auth/logout", { method: "POST" }),
  updateProfile: (body) => request("/auth/me", { method: "PATCH", body }).then((data) => data.user),
  changePassword: (body) => request("/auth/password", { method: "PATCH", body }),

  // posts
  posts: (params, { signal } = {}) => request(`/posts${toQuery(params)}`, { signal }),
  myPosts: ({ signal }) => request("/posts/mine", { signal }).then((data) => data.posts),
  post: (slug, { signal } = {}) => request(`/posts/${slugPath(slug)}`, { signal }).then((data) => data.post),
  createPost: (body) => request("/posts", { method: "POST", body }).then((data) => data.post),
  updatePost: (id, body) => request(`/posts/${id}`, { method: "PATCH", body }).then((data) => data.post),
  deletePost: (id) => request(`/posts/${id}`, { method: "DELETE" }),
  like: (id) => request(`/posts/${id}/like`, { method: "POST" }),
  unlike: (id) => request(`/posts/${id}/like`, { method: "DELETE" }),

  // comments
  comments: (postId, { signal } = {}) =>
    request(`/posts/${postId}/comments`, { signal }).then((data) => data.comments),
  addComment: (postId, content) =>
    request(`/posts/${postId}/comments`, { method: "POST", body: { content } }).then((data) => data.comment),
  deleteComment: (id) => request(`/comments/${id}`, { method: "DELETE" }),

  // discovery
  tags: ({ signal }) => request("/tags", { signal }).then((data) => data.tags),
  user: (username, { signal } = {}) => request(`/users/${encodeURIComponent(username)}`, { signal }),
};
