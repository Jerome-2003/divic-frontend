export const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

/**
 * Today at the hotel, not in UTC.
 *
 * Lagos is an hour ahead, so a date taken from toISOString() rolls over at
 * 1am. For that hour the dashboard would count a new day's arrivals as
 * tomorrow's and still show last night's departures — and, worse, the browser
 * and the server would disagree about which day it was. Both now read the
 * hotel's own clock; the server's copy is utils/day.js.
 *
 * HOTEL_TZ is a build-time setting so a property in another country is not
 * quietly wrong, and so no offset is hard-coded — Lagos observes no daylight
 * saving, but the code should not be the reason that stays true.
 */
export const HOTEL_TZ = import.meta.env.VITE_HOTEL_TZ || "Africa/Lagos";

// en-CA renders as YYYY-MM-DD, the shape every date in this app already has.
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: HOTEL_TZ, year: "numeric", month: "2-digit", day: "2-digit",
});

/** The calendar date a moment falls on, at the hotel. */
export const dayOf = (at = new Date()) =>
  dayFormatter.format(at instanceof Date ? at : new Date(at));

export const today = () => dayOf(new Date());

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: HOTEL_TZ, hour: "2-digit", hour12: false,
});

/** The hour of the day at the hotel, 0-23. "Past checkout time" is a fact
 *  about the hotel's clock, not about the clock on whatever laptop is open. */
export const hourNow = () => {
  const h = Number(hourFormatter.format(new Date()).replace(/\D/g, ""));
  return h === 24 ? 0 : h;
};

/** Calendar arithmetic over plain dates — no clock, so no zone to get wrong. */
export const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const nights = (a, b) =>
  Math.max(1, Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000));

export const prettyDate = (iso) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-NG", { day: "numeric", month: "short" });

export const prettyDateTime = (d) =>
  new Date(d).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// Both of these are tapped constantly on a phone at the front desk, so they are
// always real links, never plain text.
export const telUrl = (phone) => "tel:" + String(phone || "").replace(/\s/g, "");
export const mapUrl = (address) =>
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address + ", Nigeria");
