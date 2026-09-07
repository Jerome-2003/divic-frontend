import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, STATUS_META } from "../lib/constants";
import { naira, cap, today } from "../lib/format";
import { PageHead, Metric, Card, Empty, Loading, ErrorNote, Chip } from "../components/ui";
import ContactLines from "../components/ContactLines";
import FacilitiesCard from "../components/FacilitiesCard";

export default function Dashboard() {
  const { location, user, can } = useAuth();
  const nav = useNavigate();
  const loc = LOCATIONS[location];
  const t = today();

  const { data: rooms, loading: lr, error: er } = useApi(() => api.rooms(location), [location]);
  const { data: bookings, loading: lb, error: eb } = useApi(() => api.bookings(location), [location]);
  const { data: facilities, loading: lf, error: ef, reload: reloadFacilities } =
    useApi(() => api.facilities(location), [location]);

  if (lr || lb) return <Loading label="Reading today's position" />;
  if (er || eb) return <ErrorNote>{er || eb}</ErrorNote>;

  const inHouse = bookings.filter((b) => b.status === "in-house");
  const arrivals = bookings.filter((b) => b.status === "confirmed" && b.checkIn <= t);
  const departures = inHouse.filter((b) => b.checkOut <= t);
  const notReady = rooms.filter((r) => ["dirty", "cleaning", "maintenance"].includes(r.status));
  const occupancy = rooms.length ? Math.round((inHouse.length / rooms.length) * 100) : 0;
  const owing = inHouse.reduce((s, b) => s + Math.max(0, b.balance), 0);
  const seesMoney = can("analytics");

  return (
    <>
      <PageHead
        title={"Good day, " + user.name.split(" ")[0]}
        blurb={loc.name + " · " + new Date().toLocaleDateString("en-NG",
          { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Metric accent label="Occupancy today" value={occupancy + "%"}
          note={inHouse.length + " of " + rooms.length + " rooms"} />
        <Metric label="Arriving" value={arrivals.length}
          note={arrivals.length ? "Waiting to check in" : "Nothing pending"} />
        <Metric label="Departing" value={departures.length}
          note={departures.length ? "Settle bills before noon" : "No departures"} />
        <Metric label="Rooms to clean" value={notReady.length}
          note={notReady.length ? "On the housekeeping list" : "Every room is ready"} />
      </div>

      {seesMoney && (
        <div className="grid g2" style={{ marginBottom: 20 }}>
          <Metric label="Room revenue tonight"
            value={naira(inHouse.reduce((s, b) => s + b.rate, 0))}
            note="Nightly value of the rooms in use" />
          <Metric label="Outstanding balances" value={naira(owing)}
            note="Across guests staying tonight" />
        </div>
      )}

      <div className="grid g2">
        <Card title="Arrivals" sub={<button className="btn btn-sm btn-quiet" onClick={() => nav("/front-desk")}>Open front desk</button>}>
          {arrivals.length === 0 ? (
            <Empty heading="No one expected" text="Walk-ins can be booked straight from the front desk." />
          ) : (
            <table className="tbl">
              <tbody>
                {arrivals.map((b) => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 500 }}>{b.guest?.name}</td>
                    <td className="mono">Room {b.roomNumber}</td>
                    <td><Chip>{cap(b.roomType)}</Chip></td>
                    <td className="mono" style={{ textAlign: "right" }}>{b.nights}n</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Rooms needing attention" sub={<button className="btn btn-sm btn-quiet" onClick={() => nav("/housekeeping")}>Open housekeeping</button>}>
          {notReady.length === 0 ? (
            <Empty heading="Every room is ready" text="Housekeeping has nothing outstanding right now." />
          ) : (
            <div style={{ padding: "14px 22px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {notReady.map((r) => (
                <Chip key={r._id} tone={STATUS_META[r.status].cls}>
                  {r.number} · {STATUS_META[r.status].label}
                </Chip>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card title={loc.name} sub={rooms.length + " rooms"} pad>
          <ContactLines location={loc} />
        </Card>

        <FacilitiesCard
          facilities={facilities}
          loading={lf}
          error={ef}
          editable={can("facilities")}
          onChanged={reloadFacilities}
          sub={can("facilities") ? "You can change these" : undefined}
        />
      </div>
    </>
  );
}
