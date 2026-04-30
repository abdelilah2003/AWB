interface ToggleCardProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleCard({ label, description, checked, disabled, onChange }: ToggleCardProps) {
  return (
    <div className="bg-white border border-border-subtle rounded-xl p-4 flex items-center justify-between hover:bg-bg-card-hover transition-colors">
      <div className="flex-1">
        <div className="font-sans text-sm text-text-primary mb-1">{label}</div>
        <div className="font-sans text-xs text-text-secondary">{description}</div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-accent-primary' : 'bg-border-subtle'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
