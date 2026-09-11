import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { TOUR_STEPS } from "../data/tourSteps";

const TutorialContext = createContext(null);

const seenKey = (userId) => `divic.tour.seen.${userId}`;

/**
 * Drives the guided tour: which step is current, the filtered (permission-
 * aware) step list, and navigation between steps. TutorialOverlay is the
 * only thing that renders from this — this file has no UI of its own.
 *
 * Offered once per account, automatically, the first time that account signs
 * in on this browser (tracked in localStorage, not on the server — skipping
 * or finishing it here should never need a round trip). After that it only
 * runs when someone deliberately restarts it from the sidebar.
 */
export function TutorialProvider({ children }) {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [offered, setOffered] = useState(false);

  const steps = useMemo(() => TOUR_STEPS.filter((s) => can(s.module)), [can]);

  // Auto-offer once per account. Runs after the steps list has something in
  // it — a user with no toured pages at all (the "no screens assigned" case)
  // gets nothing to show, so there is nothing to offer them.
  useEffect(() => {
    if (!user || offered || steps.length === 0) return;
    setOffered(true);
    let seen = false;
    try { seen = localStorage.getItem(seenKey(user.id)) === "1"; } catch { /* private mode */ }
    if (!seen) {
      setStepIndex(0);
      setActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, steps.length]);

  const markSeen = useCallback(() => {
    if (!user) return;
    try { localStorage.setItem(seenKey(user.id), "1"); } catch { /* private mode */ }
  }, [user]);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const end = useCallback(() => {
    setActive(false);
    markSeen();
  }, [markSeen]);

  const next = useCallback(() => {
    if (stepIndex + 1 >= steps.length) { end(); return; }
    setStepIndex(stepIndex + 1);
  }, [stepIndex, steps.length, end]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Navigate to whichever page the current step points at. A step can become
  // out of range if permissions change mid-tour (they won't in practice, but
  // signing out and a different account signing in on the same tab could).
  const step = steps[stepIndex] || null;
  useEffect(() => {
    if (!active || !step) return;
    navigate(step.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step?.path]);

  const value = useMemo(() => ({
    active, step, stepIndex, stepCount: steps.length,
    start, next, back, skip: end,
  }), [active, step, stepIndex, steps.length, start, next, back, end]);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
