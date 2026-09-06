import { MapPin, Phone } from "lucide-react";
import { telUrl, mapUrl } from "../lib/format";

/* The address opens Maps and the number dials. Both are used constantly from a
   phone at the desk, so neither is ever plain text. */
export default function ContactLines({ location }) {
  return (
    <div>
      <div className="contact-line">
        <MapPin size={14} style={{ color: "var(--gold-deep)", flexShrink: 0 }} />
        <a href={mapUrl(location.address)} target="_blank" rel="noreferrer">{location.address}</a>
      </div>
      <div className="contact-line">
        <Phone size={14} style={{ color: "var(--gold-deep)", flexShrink: 0 }} />
        <a href={telUrl(location.phone)}>{location.phone}</a>
      </div>
    </div>
  );
}
