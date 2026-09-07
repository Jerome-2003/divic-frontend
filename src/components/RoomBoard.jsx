import { FLOOR_NAME, STATUS_META } from "../lib/constants";
import { naira, cap } from "../lib/format";
import { STATUS_ICON } from "./icons";

/**
 * The building, drawn as a cross-section: floors stacked, rooms in place.
 * Receptionists and cleaners think in floors, not table rows.
 *
 * Each tile states its status four ways — icon, word, fill and left edge — so
 * it reads from across a desk without colour ever being the only signal. The
 * fills and edges live in theme.css under `.room.<status>`, and the legend
 * below reuses the same classes so the two cannot drift apart.
 */
export default function RoomBoard({ rooms, rates, onSelect }) {
  const floors = [...new Set(rooms.map((r) => r.floor))].sort();

  return (
    <>
      <div className="legend">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const Icon = STATUS_ICON[key];
          return (
            <span key={key}>
              <i className={"lg-tile " + key}><Icon size={14} strokeWidth={1.6} /></i>
              {meta.label}
            </span>
          );
        })}
      </div>

      {floors.map((floor) => {
        const onThisFloor = rooms.filter((r) => r.floor === floor);
        return (
          <div className="floor" key={floor}>
            <div className="floor-bar">
              <span className="fname">{FLOOR_NAME[floor]}</span>
              <span className="fcount">{onThisFloor.length} rooms</span>
            </div>
            <div className="floor-rooms">
              {onThisFloor.map((room) => {
                const meta = STATUS_META[room.status];
                const Icon = STATUS_ICON[room.status];
                return (
                  <button
                    className={"room " + room.status}
                    key={room._id}
                    onClick={() => onSelect(room)}
                    aria-label={"Room " + room.number + " — " + meta.label}
                  >
                    <div className="rnum">{room.number}</div>
                    <div className="rtype">{cap(room.type)} · {naira(rates?.[room.type])}</div>
                    <div className="rstat">
                      <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                      <span>{meta.label}</span>
                    </div>
                    {room.occupant && <div className="rguest">{room.occupant.name}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
