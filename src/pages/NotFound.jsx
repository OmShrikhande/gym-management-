import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900/80 to-gray-900 text-white p-6">
      <div className="text-center max-w-xl">
        <div className="mb-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-blue-600/20 flex items-center justify-center shadow-lg shadow-blue-900/30">
            <span className="text-4xl font-extrabold">404</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Page not found</h1>
        <p className="text-gray-300 mb-6">
          Looks like you tried to lift a route that isn’t in our workout plan.
          The page you’re looking for doesn’t exist or has been moved.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/"
            className="inline-block rounded-md bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 text-white"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/settings"
            className="inline-block rounded-md bg-gray-700 hover:bg-gray-600 transition-colors px-4 py-2 text-white"
          >
            Open Settings
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-400">
          If you believe this is a mistake, please contact the admin.
        </p>
      </div>
    </div>
  );
};

export default NotFound;