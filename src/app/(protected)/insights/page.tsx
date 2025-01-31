import { DashboardInsights } from "@/components/dashboard-insights";

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        <DashboardInsights />
      </div>
    </div>
  );
}
