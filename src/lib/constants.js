// Mirrors backend/utils/constants.js. Keep the two in step.

export const LOCATIONS = {
  exclusive: {
    id: "exclusive",
    // Display name only — the location key stays "exclusive" everywhere
    // else in the app; see the matching comment in the backend constants.js.
    name: "Divic 1",
    address: "Plot 55, 1st Avenue, E Close, Festac, Lagos",
    phone: "09169845311",
    typeOrder: ["standard", "deluxe", "superior"],
    totalRooms: 15,
  },
  urban: {
    id: "urban",
    name: "Divic Urban",
    address: "Plot 340, 3rd Avenue, A1 Close, Festac, Lagos",
    phone: "09169845314",
    typeOrder: ["classic", "deluxe", "superior", "crown"],
    totalRooms: 21,
  },
};

export const FLOOR_NAME = { 0: "Ground floor", 1: "First floor", 2: "Second floor", 3: "Third floor" };

export const ROLE_LABEL = {
  owner: "Owner",
  manager: "Manager",
  receptionist: "Receptionist",
  cleaner: "Housekeeping",
  // The backend calls this role "facility". Bartenders and restaurant staff
  // do not think of themselves as facilities, so the label says what they do.
  facility: "Bar & restaurant",
};

export const STATUS_META = {
  available:   { label: "Available",     cls: "st-available" },
  occupied:    { label: "Occupied",      cls: "st-occupied" },
  dirty:       { label: "Needs cleaning",cls: "st-dirty" },
  cleaning:    { label: "Being cleaned", cls: "st-cleaning" },
  maintenance: { label: "Out of order",  cls: "st-maintenance" },
};

export const FACILITY_STATUS_META = {
  open:        { label: "Open",              cls: "st-available" },
  closed:      { label: "Closed",            cls: "st-maintenance" },
  maintenance: { label: "Under maintenance", cls: "st-dirty" },
};

export const BOOKING_STATUS = {
  confirmed: "Arriving",
  "in-house": "Staying",
  "checked-out": "Checked out",
  cancelled: "Cancelled",
  "no-show": "No show",
};

export const NAV = [
  { key: "dashboard", label: "Dashboard", path: "/" },
  { key: "bookings", label: "Bookings", path: "/bookings" },
  { key: "frontdesk", label: "Front desk", path: "/front-desk" },
  { key: "bookings", label: "Website requests", path: "/requests", alt: true },
  { key: "rooms", label: "Housekeeping", path: "/housekeeping" },
  { key: "guests", label: "Guests", path: "/guests" },
  { key: "billing", label: "Billing", path: "/billing" },
  { key: "pos", label: "Point of sale", path: "/pos" },
  { key: "analytics", label: "Analytics", path: "/analytics" },
  { key: "rates", label: "Rates", path: "/rates" },
  { key: "staff", label: "Staff", path: "/staff" },
  { key: "audit", label: "Activity log", path: "/activity" },
];
