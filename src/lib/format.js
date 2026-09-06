export const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

export const today = () => new Date().toISOString().slice(0, 10);

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
