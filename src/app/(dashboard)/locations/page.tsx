import { getLocations } from "@/app/actions/locations";
import { LocationList } from "./location-list";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const locRes = await getLocations();

  return (
    <LocationList
      initialLocations={locRes.success ? locRes.data : []}
    />
  );
}
