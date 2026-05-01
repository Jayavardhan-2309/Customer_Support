import { AdminAnalytics, StaffPerformance } from "@/types/customTypes";

export type StatusDatum = {
  name: string;
  value: number;
  fill: string;
};

export function getStatusData(ticketStats: AdminAnalytics["ticket_stats"]): StatusDatum[] {
  return [
    { name: "Open", value: ticketStats.open, fill: "#ef4444" },
    { name: "In Progress", value: ticketStats.in_progress, fill: "#f59e0b" },
    { name: "Resolved", value: ticketStats.resolved, fill: "#3b82f6" },
    { name: "Closed", value: ticketStats.closed, fill: "#22c55e" },
  ];
}

export function getStaffChartData(staffPerformance: StaffPerformance[]) {
  return staffPerformance.map((staff) => ({
    name: staff.name,
    rating: staff.avg_rating,
  }));
}
