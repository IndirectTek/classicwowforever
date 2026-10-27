// A horizontal bar split into one segment per step, sized by minutes, with
// the unplanned remainder (travel and logout) left empty at the end.

type Props = {
  stepMinutes: number[];
  availableMinutes: number;
  doneSteps?: boolean[];
  currentStep?: number;
};

export function TimeBudgetBar({ stepMinutes, availableMinutes, doneSteps, currentStep }: Props) {
  const planned = stepMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const total = Math.max(planned, availableMinutes);

  return (
    <div>
      <div
        className="flex h-3 gap-1 overflow-hidden rounded-full bg-surface-raised"
        role="img"
        aria-label={`${planned} of ${availableMinutes} minutes planned across ${stepMinutes.length} steps`}
      >
        {stepMinutes.map((minutes, i) => (
          <div
            key={i}
            style={{ width: `${(minutes / total) * 100}%` }}
            className={
              doneSteps?.[i]
                ? "bg-success"
                : i === currentStep
                  ? "bg-accent"
                  : // Alternate shades of the one accent so neighbors stay distinct.
                    i % 2
                    ? "bg-accent/45"
                    : "bg-accent/70"
            }
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-text-muted">
        <span className="font-mono text-text">{planned}</span> of{" "}
        <span className="font-mono text-text">{availableMinutes}</span> minutes planned
        {availableMinutes > planned && (
          <>, {availableMinutes - planned} left for travel and logout</>
        )}
      </p>
    </div>
  );
}
