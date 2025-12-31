export interface DashboardAlerts {
  hasCriticalAlerts: boolean;
  items: {
    type: "Budget" | "Commitment" | "Balance";
    message: string;
    action?: string;
  }[];
}
