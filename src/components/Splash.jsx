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
 * a spinner in front of everybody else.
 */
export default function Splash({ waiting }) {
  return (
    <div className="divic splash">
      <div className="splash-inner">
        <img className="splash-mark" src="/logo.png" alt="" width="104" height="104" />
        <div className="splash-word serif">Divic Exclusive Hotel</div>
        <div className="splash-rule" />
        {waiting && <div className="splash-wait">Checking your sign-in</div>}
      </div>
    </div>
  );
}
