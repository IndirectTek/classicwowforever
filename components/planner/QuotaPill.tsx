import { quotaLabel, type Quota } from "@/lib/quota";

// "2 of 3 free plans left this week"; turns warning-colored at 1 or none.
export function QuotaPill({ quota }: { quota: Quota }) {
  const low = !quota.unlimited && quota.remaining <= 1;
  return (
    <p
      className={`inline-flex rounded-full border px-3 py-1 text-sm ${
        low ? "border-warning text-warning" : "border-border text-text-muted"
      }`}
    >
      {quotaLabel(quota)}
    </p>
  );
}
