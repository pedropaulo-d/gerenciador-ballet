import { Suspense } from "react";
import { DashboardHome } from "./dashboard-home";

export default function HomePage() {
  return (
    <Suspense>
      <DashboardHome />
    </Suspense>
  );
}
