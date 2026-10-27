import type { StoredPlan } from "@/lib/schema";

type Props = {
  step: StoredPlan["steps"][number];
  index: number;
  done: boolean;
  current: boolean;
  onToggle: () => void;
  // Shown under the current step while the timer runs, e.g. "5 min left on this step".
  status?: string;
};

export function QuestStep({ step, index, done, current, onToggle, status }: Props) {
  const id = `step-${index}`;

  return (
    <li
      className={`flex gap-3 rounded-lg border p-3 transition-colors ${
        current ? "border-accent bg-surface-raised" : "border-transparent"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={done}
        onChange={onToggle}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-success"
      />
      <label htmlFor={id} className="flex-1 cursor-pointer">
        <span className={done ? "text-text-muted line-through" : "text-text"}>{step.action}</span>
        {step.quests.length > 0 && (
          <span className="mt-1 block text-sm text-text-muted">
            {step.quests.map((quest) => quest.name).join(" · ")}
          </span>
        )}
        {status && <span className="mt-1 block text-sm text-accent">{status}</span>}
      </label>
      <span className="h-fit shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-sm text-text-muted">
        {step.minutes}m
      </span>
    </li>
  );
}
