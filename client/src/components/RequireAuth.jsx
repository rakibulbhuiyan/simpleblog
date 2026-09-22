import { Navigate, useLocation } from "react-router";

import { useAuth } from "../hooks/useAuth.js";
import { PageSpinner } from "./Feedback.jsx";

export default function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSpinner />;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}
