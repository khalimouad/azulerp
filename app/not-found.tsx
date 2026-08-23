import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Page non trouvée</h2>
        <p className="text-slate-600 mb-6 text-sm">La page demandée n&apos;existe pas ou a été déplacée.</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
