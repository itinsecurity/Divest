type Status = "PENDING" | "COMPLETE" | "PARTIAL" | "NOT_FOUND" | "NEEDS_INPUT";

const statusConfig: Record<
  Status,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800",
  },
  COMPLETE: {
    label: "Complete",
    className: "bg-green-100 text-green-800",
  },
  PARTIAL: {
    label: "Partial",
    className: "bg-blue-100 text-blue-800",
  },
  NOT_FOUND: {
    label: "Not Found",
    className: "bg-red-100 text-red-800",
  },
  NEEDS_INPUT: {
    label: "Needs Input",
    className: "bg-orange-100 text-orange-800",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
