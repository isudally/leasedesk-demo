import { Users, DollarSign, AlertCircle, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  variant?: "default" | "warning" | "success";
}

function StatCard({ title, value, icon, trend, variant = "default" }: StatCardProps) {
  const variantColors = {
    default: "text-primary",
    warning: "text-chart-3",
    success: "text-chart-2",
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold mt-2" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        <div className={`${variantColors[variant]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface DashboardStatsProps {
  totalTenants: number;
  monthlyRevenue: number;
  expiringContracts: number;
  occupancyRate: number;
}

export function DashboardStats({
  totalTenants,
  monthlyRevenue,
  expiringContracts,
  occupancyRate,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Tenants"
        value={totalTenants}
        icon={<Users className="h-8 w-8" />}
        variant="default"
      />
      <StatCard
        title="Monthly Revenue"
        value={`MUR ${monthlyRevenue.toLocaleString()}`}
        icon={<DollarSign className="h-8 w-8" />}
        variant="success"
      />
      <StatCard
        title="Expiring Soon"
        value={expiringContracts}
        icon={<AlertCircle className="h-8 w-8" />}
        trend="Within 3 months"
        variant="warning"
      />
      <StatCard
        title="Occupancy Rate"
        value={`${occupancyRate}%`}
        icon={<Calendar className="h-8 w-8" />}
        variant="success"
      />
    </div>
  );
}
