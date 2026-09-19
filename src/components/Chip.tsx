interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-[13px] py-[9px] text-[11px] font-bold ${
        selected
          ? 'border border-navy bg-navy text-white'
          : 'border border-border bg-white text-ink font-medium'
      }`}
    >
      {label}
    </button>
  );
}
