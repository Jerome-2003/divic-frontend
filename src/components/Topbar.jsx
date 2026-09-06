import { Building2, Phone, MapPin, Cloud, CloudOff, WifiOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS } from "../lib/constants";
import { telUrl, mapUrl } from "../lib/format";

export default function Topbar({ online, pending }) {
  const { location, setLocation, canSwitchLocation } = useAuth();
  const loc = LOCATIONS[location];

  return (
    <header className="top">
      {canSwitchLocation ? (
        <div className="locswitch" role="group" aria-label="Choose property">
          {Object.values(LOCATIONS).map((l) => (
            <button key={l.id} className={location === l.id ? "on" : ""} onClick={() => setLocation(l.id)}>
              {l.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="locpill">
          <Building2 size={14} style={{ color: "var(--gold-deep)" }} /> {loc.name}
        </div>
      )}

      <a className="locpill" href={telUrl(loc.phone)}>
        <Phone size={13} style={{ color: "var(--gold-deep)" }} /> {loc.phone}
      </a>
      <a className="locpill" href={mapUrl(loc.address)} target="_blank" rel="noreferrer">
        <MapPin size={13} style={{ color: "var(--gold-deep)" }} /> Directions
      </a>

      <div className={"sync" + (!online || pending ? " warn" : "")}>
        {!online
          ? <><WifiOff size={14} /> Offline — changes will send when you reconnect</>
          : pending
            ? <><CloudOff size={14} /> {pending} change{pending === 1 ? "" : "s"} waiting</>
            : <><Cloud size={14} /> Live</>}
      </div>
    </header>
  );
}
