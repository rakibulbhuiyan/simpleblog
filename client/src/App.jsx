import { lazy } from "react";
import { Route, Routes } from "react-router";

import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import HomePage from "./pages/HomePage.jsx";
import { LoginPage, RegisterPage } from "./pages/AuthPages.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

// Markdown + syntax highlighting are only downloaded when reading or writing.
const PostPage = lazy(() => import("./pages/PostPage.jsx"));
const EditorPage = lazy(() => import("./pages/EditorPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));

const protect = (element) => <RequireAuth>{element}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="post/:slug" element={<PostPage />} />
        <Route path="u/:username" element={<ProfilePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="write" element={protect(<EditorPage key="new" />)} />
        <Route path="edit/:slug" element={protect(<EditorPage />)} />
        <Route path="dashboard" element={protect(<DashboardPage />)} />
        <Route path="settings" element={protect(<SettingsPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
