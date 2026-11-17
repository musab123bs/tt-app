const styles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  OPEN_REGISTRATION: "bg-emerald-50 text-emerald-700",
  REGISTRATION_CLOSED: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-violet-50 text-violet-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const labels: Record<string, string> = {
  DRAFT: "Draft",
  OPEN_REGISTRATION: "Open for registration",
  REGISTRATION_CLOSED: "Registration closed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function TournamentStatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>{labels[status] ?? status}</span>;
}
