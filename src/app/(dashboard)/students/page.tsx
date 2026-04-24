import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import { getStudentsPaginated } from "@/app/actions/students";
import { StudentList } from "./student-list";

const PAGE_SIZE = 10;
const ALL = "__all__";

type SearchParams = Promise<{
  q?: string;
  location?: string;
  class?: string;
  page?: string;
}>;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const search = sp.q?.trim() || undefined;
  const locationId =
    sp.location && sp.location !== ALL ? sp.location : undefined;
  const classId = sp.class && sp.class !== ALL ? sp.class : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [locRes, clsRes, studentsRes] = await Promise.all([
    getLocations(),
    getClassesWithLocation(),
    getStudentsPaginated({ search, locationId, classId, page, pageSize: PAGE_SIZE }),
  ]);

  return (
    <StudentList
      initialStudents={studentsRes.success ? studentsRes.data.students : []}
      initialTotal={studentsRes.success ? studentsRes.data.total : 0}
      initialLocations={locRes.success ? locRes.data : []}
      initialClasses={clsRes.success ? clsRes.data : []}
    />
  );
}
