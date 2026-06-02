interface BriefingCardProps {
  contactName: string;
  bullets: string[];
  onDismiss: () => void;
}

export default function BriefingCard({ contactName, bullets, onDismiss }: BriefingCardProps) {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-0.5">Briefing</p>
          <h3 className="text-lg font-semibold text-indigo-900">{contactName}</h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-indigo-300 hover:text-indigo-500 text-xl leading-none mt-1"
        >
          ×
        </button>
      </div>

      {bullets.length > 0 ? (
        <ul className="space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-indigo-400 italic">No notes found for {contactName}.</p>
      )}
    </div>
  );
}
