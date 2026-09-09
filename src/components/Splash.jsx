import { useEffect, useState } from "react";

/**
 * Shown while the stored session is checked.
 *
 * The mark arrives first, then the wordmark resolves out of a blur a beat
 * later. The timing lives in theme.css and finishes at 1.28s — staff see this
 * several times a day, so it is deliberately brief. Under prefers-reduced-motion
 * both are painted immediately; see the reduced-motion block in theme.css.
 *
 * `waiting` is set only once the animation is over and the session check is
 * still running, so a slow network gets a word of explanation without putting
 * a spinner in front of everybody else. If it keeps running past a few more
 * seconds, that's almost always the backend waking up from a cold start
 * rather than an ordinary slow network, so the message escalates to say so
 * plainly instead of leaving the same vague line up for a minute.
 */
export default function Splash({ waiting }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!waiting) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [waiting]);

  return (
    <div className="divic splash">
      <div className="splash-inner">
        <img className="splash-mark" src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="104" height="104" />
        <div className="splash-word serif">Divic Exclusive Hotels</div>
        <div className="splash-rule" />
        {waiting && (
          <div className="splash-wait">
            {slow ? "Waking up the server — this can take up to a minute" : "Checking your sign-in"}
          </div>
        )}
      </div>
    </div>
  );
}