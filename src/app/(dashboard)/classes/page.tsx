import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import { ClassList } from "./class-list";

export const dynamic = "force-dynamic";

const ALL = "__all__";

type SearchParams = Promise<{
  location?: string;
}>;

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locationId =
    sp.location && sp.location !== ALL ? sp.location : undefined;

  const [locRes, clsRes] = await Promise.all([
    getLocations(),
    getClassesWithLocation(locationId),
  ]);

  return (
    <ClassList
      initialClasses={clsRes.success ? clsRes.data : []}
      initialLocations={locRes.success ? locRes.data : []}
    />
  );
}
