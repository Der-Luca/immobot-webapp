import { Link } from "react-router-dom";

export default function DashboardCard({ title, description, to, status }) {
  return (
    <Link
      to={to}
      className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition"
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {description}
          </p>
        </div>

        <span className="shrink-0 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
          {status}
        </span>
      </div>
    </Link>
  );
}
