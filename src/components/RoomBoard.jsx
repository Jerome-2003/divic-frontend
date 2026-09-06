import { FLOOR_NAME, STATUS_META } from "../lib/constants";
import { naira, cap } from "../lib/format";

/**
 * The building, drawn as a cross-section: floors stacked, rooms in place.
 * Receptionists and cleaners think in floors, not table rows.
 */
export default function RoomBoard({ rooms, rates, onSelect }) {
  const floors = [...new Set(rooms.map((r) => r.floor))].sort();

  return (
    <>
      <div className="legend">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key}>
            <i className={"rdot " + key} style={{ width: 9, height: 9 }} />
            {meta.label}
          </span>
        ))}
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
              {onThisFloor.map((room) => (
                <button className="room" key={room._id} onClick={() => onSelect(room)}>
                  <div className="rnum">{room.number}</div>
                  <div className="rtype">{cap(room.type)} · {naira(rates?.[room.type])}</div>
                  <span className={"rdot " + room.status} />
                  <div className="rguest">
                    {room.occupant ? room.occupant.name : STATUS_META[room.status].label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
