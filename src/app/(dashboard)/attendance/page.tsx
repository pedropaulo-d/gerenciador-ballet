import { getClassesWithLocation } from "@/app/actions/classes";
import { getAttendanceByClassAndDate } from "@/app/actions/attendance";
import { todayISO } from "@/lib/formatters";
import { AttendanceManager } from "./attendance-manager";

export const dynamic = "force-dynamic";

const NONE = "__none__";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type SearchParams = Promise<{
  date?: string;
  class?: string;
}>;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const date = sp.date && DATE_RE.test(sp.date) ? sp.date : todayISO();
  const classId = sp.class && sp.class !== NONE ? sp.class : null;

  const [clsRes, rowsRes] = await Promise.all([
    getClassesWithLocation(),
    classId ? getAttendanceByClassAndDate(classId, date) : Promise.resolve(null),
  ]);

  return (
    <AttendanceManager
      initialClasses={clsRes.success ? clsRes.data : []}
      initialRows={rowsRes && rowsRes.success ? rowsRes.data : []}
      currentDate={date}
      currentClassId={classId ?? NONE}
    />
  );
}
