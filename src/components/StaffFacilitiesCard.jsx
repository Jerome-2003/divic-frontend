import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import FacilitiesCard from "./FacilitiesCard";

/**
 * The facilities card for people who have no dashboard to find it on.
 *
 * Facility staff need to be able to close their own bar when the keg runs out,
 * and their role has no dashboard — so the card follows them onto whichever
 * facility screen they actually work. It renders nothing for everyone else,
 * who already have it on the dashboard and do not need it twice.
 */
export default function StaffFacilitiesCard() {
  const { location, user, can } = useAuth();
  const hasDashboard = can("dashboard");
  const { data, loading, error, reload } = useApi(
    () => (hasDashboard ? Promise.resolve([]) : api.facilities(location)),
    [location, hasDashboard],
  );

  if (hasDashboard) return null;

  return (
    <div style={{ marginTop: 26 }}>
      <FacilitiesCard
        facilities={data}
        loading={loading}
        error={error}
        editable={can("facilities")}
        canPrice={["manager", "owner"].includes(user.role)}
        onChanged={reload}
        title="Your facilities"
        sub={can("facilities") ? "You can open and close these" : undefined}
      />
    </div>
  );
}
