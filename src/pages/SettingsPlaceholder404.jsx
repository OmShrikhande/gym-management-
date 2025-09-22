import { Link } from "react-router-dom";

const SettingsPlaceholder404 = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900/80 to-gray-900 text-white p-6">
      <div className="text-center max-w-2xl">
        {/* Fun gym-style illustration using emojis and shapes (no external assets) */}
        <div className="relative mx-auto mb-8 h-36 w-36">
          <div className="absolute inset-0 rounded-full bg-blue-600/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center shadow-lg shadow-blue-900/30">
            <span className="text-5xl md:text-6xl leading-none select-none pt-1">😤</span>
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">"Where are those settings?!"</div>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Settings on Rest Day</h1>
        <p className="text-gray-300 mb-6 leading-relaxed">
          Our strongest bodybuilder tried to find the Settings page, lifted every route, checked under the dumbbells, and still couldn’t find it. Now he's mildly furious (in a friendly gym way) and taking a protein shake break. 🧃
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/"
            className="inline-block rounded-md bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 text-white"
          >
            Back to Dashboard
          </Link>
          <Link
            to="/workouts"
            className="inline-block rounded-md bg-gray-700 hover:bg-gray-600 transition-colors px-4 py-2 text-white"
          >
            Do Some Workouts
          </Link>
          <Link
            to="/reports"
            className="inline-block rounded-md bg-emerald-600 hover:bg-emerald-700 transition-colors px-4 py-2 text-white"
          >
            Check Progress
          </Link>
        </div>

        <div className="mt-8 p-4 rounded-lg bg-gray-800/60 border border-gray-700 text-left">
          <h2 className="text-lg font-semibold mb-2">What happened?</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>This Settings page is not ready yet (still warming up).</li>
            <li>Your access is fine — the route is just taking a break.</li>
            <li>Try again later, or keep crushing your routine elsewhere.</li>
          </ul>
        </div>

        <p className="mt-6 text-sm text-gray-400">Need it urgently? Ping the admin and say the bodybuilder is getting impatient. 😅</p>
      </div>
    </div>
  );
};

export default SettingsPlaceholder404;