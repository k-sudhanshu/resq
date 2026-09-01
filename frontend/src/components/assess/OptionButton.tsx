export default function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    // Large targets with generous spacing: the user may be shaking, and an
    // accidental tap costs time in an emergency. Selected state is a green
    // radio card — visible at arm's length, including on cheap screens.
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-touch w-full items-center gap-3 rounded-md border px-5 py-3 text-left text-instruction-xl transition-colors ${
        selected
          ? 'border-tertiary-bright bg-tertiary-container text-tertiary'
          : 'border-outline-variant bg-surface-lowest text-onSurface hover:bg-surface-low'
      }`}
      style={{ borderLeftWidth: '6px' }}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected
            ? 'border-tertiary-bright'
            : 'border-outline'
        }`}
      >
        {selected ? (
          <span className="h-2.5 w-2.5 rounded-full bg-tertiary-bright" />
        ) : null}
      </span>
      {label}
    </button>
  );
}
