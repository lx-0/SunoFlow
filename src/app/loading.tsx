import { ShellSkeleton } from "@/components/ShellSkeleton";
import { DashboardSkeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <ShellSkeleton>
      <DashboardSkeleton />
    </ShellSkeleton>
  );
}
