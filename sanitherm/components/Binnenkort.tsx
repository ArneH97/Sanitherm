export default function Binnenkort({
  titel,
  tekst,
}: {
  titel: string;
  tekst: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{titel}</h1>
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">{tekst}</p>
        <p className="mt-2 text-xs text-slate-400">Komt in een volgende fase.</p>
      </div>
    </div>
  );
}
