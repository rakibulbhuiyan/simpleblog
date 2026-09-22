import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export default function NotFoundPage({ message = "The page you're looking for wandered off or never existed." }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
      <title>Not found · SimpleBlog</title>
      <p className="font-display text-8xl font-semibold text-brand-600 italic sm:text-9xl dark:text-brand-400">404</p>
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Nothing to read here</h1>
      <p className="mt-3 max-w-md text-stone-600 dark:text-stone-400">{message}</p>
      <Link to="/" className="btn btn-primary mt-8">
        <ArrowLeft /> Back to all stories
      </Link>
    </div>
  );
}
