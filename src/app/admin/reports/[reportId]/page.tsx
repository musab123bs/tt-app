import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionDialog } from "@/components/admin/action-dialog";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, Panel, StatusBadge, formatDate, label } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getReportDetail, reportTypeLabels } from "@/lib/services/reports";

export const instant = false;

export default async function AdminReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const admin = await requireSuperAdmin();
  const { reportId } = await params;
  const report = await getReportDetail(reportId);
  if (!report) notFound();
  const endpoint = `/api/admin/reports/${report.id}`;
  const open = report.status === "PENDING" || report.status === "UNDER_REVIEW";
  return <AdminShell adminName={admin.name}>
    <Link href="/admin/reports" className="text-sm text-slate-500 hover:text-slate-900">← Reports</Link>
    <div className="mt-3"><AdminHeader title={reportTypeLabels[report.type]} description={`Submitted by ${report.reporter.name} (${report.reporter.email}) · ${formatDate(report.createdAt)}`} action={<StatusBadge value={report.status} />} /></div>
    <div className="mb-6 flex flex-wrap gap-2">
      {report.status === "PENDING" && <ActionDialog label="Start review" title="Mark report under review" description="The reporter is notified that the report is being reviewed." endpoint={endpoint} payload={{ action: "status", status: "UNDER_REVIEW" }} fields={[{ name: "note", label: "Internal note (optional)", type: "textarea" }]} />}
      {open && <ActionDialog label="Resolve" title="Resolve report" description="Record how the issue was resolved. The reporter sees the resolution." endpoint={endpoint} payload={{ action: "status", status: "RESOLVED" }} tone="primary" confirmLabel="Resolve" fields={[{ name: "resolution", label: "Resolution", type: "textarea", required: true }]} />}
      {open && <ActionDialog label="Reject" title="Reject report" description="Explain why no action is needed. The reporter sees this reason." endpoint={endpoint} payload={{ action: "status", status: "REJECTED" }} tone="danger" confirmLabel="Reject" fields={[{ name: "resolution", label: "Reason", type: "textarea", required: true }]} />}
      {!open && <ActionDialog label="Reopen" title="Reopen report" description="Move the report back under review." endpoint={endpoint} payload={{ action: "status", status: "UNDER_REVIEW" }} fields={[{ name: "note", label: "Internal note", type: "textarea" }]} />}
      <ActionDialog label="Add internal note" title="Add internal note" description="Internal notes are only visible to Super Admins." endpoint={endpoint} payload={{ action: "note" }} fields={[{ name: "note", label: "Note", type: "textarea", required: true }]} />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Details">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{report.description}</p>
        {report.resolution && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><span className="font-medium">Resolution:</span> {report.resolution}</p>}
        <dl className="mt-4 space-y-2 text-sm">
          {report.match && <div><dt className="text-xs text-slate-500">Match</dt><dd><Link href={`/admin/matches/${report.match.id}`} className="text-blue-700">{report.match.player1.name} vs {report.match.player2.name}</Link> · {report.match.player1GamesWon}–{report.match.player2GamesWon} · {label(report.match.status)}{report.match.reviewStatus === "UNDER_REVIEW" ? " · under review" : ""}</dd></div>}
          {report.tournament && <div><dt className="text-xs text-slate-500">Tournament</dt><dd><Link href={`/admin/tournaments/${report.tournament.id}`} className="text-blue-700">{report.tournament.name}</Link> · {label(report.tournament.status)}</dd></div>}
          {report.targetUser && <div><dt className="text-xs text-slate-500">Reported player</dt><dd><Link href={`/admin/players/${report.targetUser.id}`} className="text-blue-700">{report.targetUser.name}</Link> · {label(report.targetUser.status)}</dd></div>}
          {report.assignedTo && <div><dt className="text-xs text-slate-500">Handled by</dt><dd>{report.assignedTo.name}</dd></div>}
        </dl>
      </Panel>
      <Panel title="History">
        <ol className="space-y-3">{report.events.map((event) => <li key={event.id} className="border-l-2 border-slate-200 pl-3 text-sm"><p className="font-medium">{event.kind === "CREATED" ? "Report submitted" : event.kind === "NOTE" ? "Internal note" : `Status: ${label(event.fromStatus ?? "")} → ${label(event.toStatus ?? "")}`}</p><p className="text-xs text-slate-500">{event.actor.name} · {formatDate(event.createdAt)}</p>{event.note && <p className="mt-1 whitespace-pre-wrap text-slate-600">{event.note}</p>}</li>)}</ol>
      </Panel>
    </div>
  </AdminShell>;
}
