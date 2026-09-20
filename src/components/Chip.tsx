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
      className={`rounded-full px-[18px] py-2.5 text-[13px] transition-colors ${
        selected
          ? 'border border-navy bg-navy font-bold text-white'
          : 'border border-line bg-white font-medium text-ink hover:bg-surface'
      }`}
    >
      {label}
    </button>
  );
}
