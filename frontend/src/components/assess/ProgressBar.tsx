export default function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const percent = Math.round((current / total) * 100);
  return (
    // A thick bar, per the design system: it must be readable at a glance by
    // someone who is not looking carefully.
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-highest"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div
        className="h-full bg-primary-container transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
