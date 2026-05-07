import { BottomNav } from "@/components/BottomNav";
import { ScheduleRunner } from "@/components/ScheduleRunner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-cream">
      <main className="max-w-md mx-auto pb-24">{children}</main>
      <BottomNav />
      <ScheduleRunner />
    </div>
  );
}
