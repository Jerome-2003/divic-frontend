import { useEffect, useState } from "react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { useTutorial } from "../context/TutorialContext";
import { PageHead, Empty, Loading, ErrorNote } from "./ui";
import StaffFacilitiesCard from "./StaffFacilitiesCard";
import FacilityPicker from "./FacilityPicker";

/**
 * The wrapper the Pool and Gym screens share: find this property's facilities
 * of one type, let the user pick if there is more than one, and hand the chosen
 * one to the screen itself.
 *
 * It exists mostly to get one thing right in one place — a property that simply
 * does not have this facility. Divic 1 has no gym, and the honest answer there
 * is to say so plainly rather than render an empty screen that looks broken.
 */
export default function FacilityScreen({ type, title, blurb, emptyText, children }) {
  const { location, user } = useAuth();
  const isManager = ["manager", "owner"].includes(user.role);
  const { data: facilities, loading, error } = useApi(() => api.facilities(location), [location]);
  const [pickedId, setPickedId] = useState(null);

  // As on the bar: the tour is about the screen behind this, and somebody
  // assigned to two of them would otherwise watch it from the picker.
  const { active: touring, step: tourStep } = useTutorial();
  const mineNow = (facilities || []).filter((f) => f.assignedToMe && f.type === type);
  const firstId = mineNow[0]?.id;
  useEffect(() => {
    if (!touring || pickedId || mineNow.length < 2) return;
    if (tourStep?.target === "facility-picker") return;
    setPickedId(firstId);
  }, [touring, tourStep?.target, pickedId, mineNow.length, firstId]);

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const mine = (facilities || []).filter((f) => f.assignedToMe && f.type === type);

  if (!mine.length) {
    return (
      <>
        <PageHead title={title} />
        <Empty heading={"No " + type + " here"} text={emptyText} />
      </>
    );
  }

  const facility = mine.find((f) => f.id === pickedId) || (mine.length === 1 ? mine[0] : null);

  if (!facility) {
    return <FacilityPicker title={"Which " + type + " are you working?"} facilities={mine} onPick={setPickedId} />;
  }

  return (
    <>
      <PageHead title={facility.name} blurb={blurb}>
        {mine.length > 1 && (
          <button className="btn" onClick={() => setPickedId(null)}>Switch</button>
        )}
      </PageHead>
      {children({ facility, isManager })}
      <StaffFacilitiesCard />
    </>
  );
}
