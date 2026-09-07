/**
 * lucide-react has no mop, so this is drawn to sit beside the ones it does
 * have: the same 24px grid, 1.6 stroke by default, round caps and joins, no
 * fill. Next to DoorOpen and TrafficCone on a room tile it should not read as
 * having come from somewhere else.
 */
export default function Mop({ size = 24, strokeWidth = 1.6, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M15 2.5 12.8 10.5" />
      <rect x="7.5" y="10.5" width="9" height="3.5" rx="1.2" />
      <path d="M9.4 14 7.9 21" />
      <path d="M12 14v7" />
      <path d="M14.6 14 16.1 21" />
    </svg>
  );
}
