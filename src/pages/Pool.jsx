import FacilityScreen from "../components/FacilityScreen";
import VisitLog from "../components/VisitLog";

/**
 * The pool: who is in it, and what they paid to be there.
 *
 * Nothing is sold here, so there is no till and no menu — just the entry fee,
 * which a manager sets on the facility itself.
 */
export default function Pool() {
  return (
    <FacilityScreen
      type="pool"
      title="Pool"
      blurb="Log guests in as they arrive, and mark them gone when they leave."
      emptyText="There is no pool assigned to you at this property."
    >
      {({ facility, isManager }) => <VisitLog facility={facility} isManager={isManager} />}
    </FacilityScreen>
  );
}
