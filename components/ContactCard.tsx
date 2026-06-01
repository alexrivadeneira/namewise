import type { ContactWithDetails } from "@/lib/types";

interface ContactCardProps {
  contact: ContactWithDetails;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContactCard({ contact }: ContactCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{contact.name}</h3>
      </div>

      {contact.aliases.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {contact.aliases.map((a) => (
            <span
              key={a.id}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {a.name}
            </span>
          ))}
        </div>
      )}

      {contact.dictations.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Mentions ({contact.dictations.length})
          </p>
          {contact.dictations.map((d) => (
            <div key={d.id} className="text-sm text-gray-600">
              <span className="text-xs text-gray-400 mr-2">{formatDate(d.created_at)}</span>
              {d.text.length > 120 ? d.text.slice(0, 120) + "…" : d.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
