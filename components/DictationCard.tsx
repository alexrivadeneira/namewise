import type { DictationWithContacts } from "@/lib/types";

interface DictationCardProps {
  dictation: DictationWithContacts;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DictationCard({ dictation }: DictationCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-gray-800 leading-relaxed mb-3">{dictation.text}</p>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          {dictation.contacts.map((c) => (
            <span
              key={c.id}
              className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium"
            >
              {c.name}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-400">{formatDate(dictation.created_at)}</span>
      </div>
    </div>
  );
}
