import { Suspense } from "react";
import { StudentList } from "./student-list";

export default function StudentsPage() {
  return (
    <Suspense>
      <StudentList />
    </Suspense>
  );
}
