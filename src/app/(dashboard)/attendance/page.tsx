import { Suspense } from "react";
import { AttendanceManager } from "./attendance-manager";

export default function AttendancePage() {
  return (
    <Suspense>
      <AttendanceManager />
    </Suspense>
  );
}
