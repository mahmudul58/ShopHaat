import { Link } from "react-router-dom";

import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Button } from "../components/common/Button";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "404 Not Found" }]} className="mb-4 justify-center" />
      <h1 className="text-3xl font-bold text-text-primary">Page not found</h1>
      <p className="mt-2 text-text-secondary">The page you're looking for doesn't exist.</p>
      <Link to="/">
        <Button className="mt-6">Back to home</Button>
      </Link>
    </div>
  );
}
