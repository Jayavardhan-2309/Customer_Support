export const STATUS_OPTIONS = [
  { label: "All tickets", value: "all" },
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
] as const;

export const RANGE_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 3 days", value: 3 },
] as const;
