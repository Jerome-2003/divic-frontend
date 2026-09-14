const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "divic.token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/**
 * Every request funnels through here so error handling and the 401 redirect
 * live in one place. Server errors arrive as { error: "..." } and are thrown as
 * real Error objects with the server's own wording — the API already writes
 * messages meant for staff to read, so the UI shows them unchanged.
 */
async function request(path, { method = "GET", body, params } = {}) {
  const url = new URL(BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }

  const token = getToken();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("divic:signed-out"));
    throw new Error("Your session has expired. Sign in again.");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || "Something went wrong.");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  login: (username, password) => request("/api/auth/login", { method: "POST", body: { username, password } }),
  me: () => request("/api/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    request("/api/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }),
  markTourSeen: () => request("/api/auth/me/tour-seen", { method: "PUT" }),

  // Shifts. A shift opens when somebody signs in; signing out is not the same
  // as going home, so ending one is asked for rather than assumed.
  myShift: () => request("/api/auth/my-shift"),
  endMyShift: () => request("/api/auth/end-shift", { method: "POST" }),
  endStaffShift: (id) => request(`/api/staff/${id}/end-shift`, { method: "POST" }),
  shiftsWorked: (from, to) => request("/api/staff/shifts", { params: { from, to } }),

  // The filed record of a month or a year, across the business.
  performanceReport: (params) => request("/api/analytics/report", { params }),
  // Which closed months and years this person has not taken a copy of yet.
  reportsDue: () => request("/api/analytics/report/due"),
  markReportTaken: (kind, period) => request("/api/analytics/report/due", { method: "POST", body: { kind, period } }),

  // rooms + rates
  rooms: (location) => request("/api/rooms", { params: { location } }),
  setRoomStatus: (id, status, note) => request(`/api/rooms/${id}/status`, { method: "PATCH", body: { status, note } }),
  availability: (location, checkIn, checkOut, roomType) =>
    request("/api/rooms/availability", { params: { location, checkIn, checkOut, roomType } }),
  rates: (location) => request("/api/rooms/rates", { params: { location } }),
  saveRates: (location, prices) => request("/api/rooms/rates", { method: "PUT", body: { location, prices } }),

  // Offers against those rates. Shown to guests in their own right on the
  // website; taken off the price by the server at the moment of booking.
  discounts: (location) => request("/api/rooms/discounts", { params: { location } }),
  createDiscount: (location, body) => request("/api/rooms/discounts", { method: "POST", params: { location }, body }),
  updateDiscount: (location, id, body) => request(`/api/rooms/discounts/${id}`, { method: "PATCH", params: { location }, body }),
  deleteDiscount: (location, id) => request(`/api/rooms/discounts/${id}`, { method: "DELETE", params: { location } }),

  // bookings
  bookings: (location, params) => request("/api/bookings", { params: { location, ...params } }),
  createBooking: (payload) => request("/api/bookings", { method: "POST", body: payload }),
  // `extra` carries a manager's or owner's override — see lib/useOverride.jsx.
  // These are a receptionist's routine work, so the server asks anyone else for
  // a reason, and it has to have somewhere to travel.
  checkIn: (id, extra) => request(`/api/bookings/${id}/check-in`, { method: "POST", body: { ...extra } }),
  checkOut: (id, allowUnpaid, extra) =>
    request(`/api/bookings/${id}/check-out`, { method: "POST", body: { allowUnpaid, ...extra } }),
  updateBookingDates: (id, checkIn, checkOut, reason, extra) =>
    request(`/api/bookings/${id}/dates`, { method: "PATCH", body: { checkIn, checkOut, reason, ...extra } }),
  cancelBooking: (id, reason) => request(`/api/bookings/${id}/cancel`, { method: "POST", body: { reason } }),

  // website requests
  requests: (location, status) => request("/api/requests", { params: { location, status } }),
  acceptRequest: (id, roomNumber) => request(`/api/requests/${id}/accept`, { method: "POST", body: { roomNumber } }),
  declineRequest: (id, reason) => request(`/api/requests/${id}/decline`, { method: "POST", body: { reason } }),

  // guests
  guests: (q) => request("/api/guests", { params: { q } }),
  guest: (id) => request(`/api/guests/${id}`),
  updateGuest: (id, body) => request(`/api/guests/${id}`, { method: "PATCH", body }),

  // billing
  folios: (location) => request("/api/payments/folios", { params: { location } }),
  // One guest's bill, itemised: the room line, then every facility charge they
  // signed to the room, named and dated.
  folio: (bookingId) => request(`/api/payments/folio/${bookingId}`),
  // One guest's bill, itemised: the room line plus every facility charge
  // sitting on the room.
  folio: (bookingId) => request(`/api/payments/folio/${bookingId}`),
  paymentsFor: (bookingId) => request(`/api/payments/booking/${bookingId}`),
  initPaystack: (bookingId, amount, email) =>
    request("/api/payments/paystack/initialize", { method: "POST", body: { bookingId, amount, email } }),
  recordPayment: (payload) => request("/api/payments", { method: "POST", body: payload }),
  voidPayment: (id, reason) => request(`/api/payments/${id}/void`, { method: "POST", body: { reason } }),

  // staff
  staff: () => request("/api/staff"),
  createStaff: (body) => request("/api/staff", { method: "POST", body }),
  updateStaff: (id, body) => request(`/api/staff/${id}`, { method: "PATCH", body }),

  // facilities + point of sale
  facilities: (location) => request("/api/facilities", { params: { location } }),
  setFacilityStatus: (id, status, note) =>
    request(`/api/facilities/${id}`, { method: "PATCH", body: { status, note } }),
  // Returns the room number and the guest's surname, and nothing else. There
  // is deliberately no endpoint that lists who is in house.
  facilityGuestLookup: (facilityId, room) =>
    request(`/api/facilities/${facilityId}/guest-lookup`, { params: { room } }),
  facilityCharges: (facilityId, date) =>
    request(`/api/facilities/${facilityId}/charges`, { params: { date } }),
  postFacilityCharge: (facilityId, payload) =>
    request(`/api/facilities/${facilityId}/charges`, { method: "POST", body: payload }),
  // Managers and owners only — the server refuses this from facility staff.
  voidFacilityCharge: (facilityId, chargeId, reason) =>
    request(`/api/facilities/${facilityId}/charges/${chargeId}/void`, { method: "POST", body: { reason } }),
  setFacilityEntryFee: (id, status, entryFee) =>
    request(`/api/facilities/${id}`, { method: "PATCH", body: { status, entryFee } }),

  // bar + restaurant: the menu, and each table's running order
  menu: (facilityId, all) => request(`/api/facilities/${facilityId}/menu`, { params: { all } }),
  addMenuItem: (facilityId, body) =>
    request(`/api/facilities/${facilityId}/menu`, { method: "POST", body }),
  updateMenuItem: (facilityId, itemId, body) =>
    request(`/api/facilities/${facilityId}/menu/${itemId}`, { method: "PATCH", body }),

  tabs: (facilityId, status, date) =>
    request(`/api/facilities/${facilityId}/tabs`, { params: { status, date } }),
  updateTab: (facilityId, tabId, body) =>
    request(`/api/facilities/${facilityId}/tabs/${tabId}`, { method: "PATCH", body }),
  openTab: (facilityId, body) => request(`/api/facilities/${facilityId}/tabs`, { method: "POST", body }),
  addTabLine: (facilityId, tabId, body) =>
    request(`/api/facilities/${facilityId}/tabs/${tabId}/lines`, { method: "POST", body }),
  // A quantity of zero removes the line, so this is also how the bin button
  // works — one route, and the manager's override rides in the body either way.
  setTabLineQty: (facilityId, tabId, lineId, qty, extra) =>
    request(`/api/facilities/${facilityId}/tabs/${tabId}/lines/${lineId}`, {
      method: "PATCH", body: { qty, ...extra },
    }),
  // Resolves with the tab plus everything the printed receipt needs.
  settleTab: (facilityId, tabId, body) =>
    request(`/api/facilities/${facilityId}/tabs/${tabId}/settle`, { method: "POST", body }),
  // Closing a table that should not have been opened. Open tables only; a
  // settled one has money against it and is voided instead.
  discardTab: (facilityId, tabId, reason, extra) =>
    request(`/api/facilities/${facilityId}/tabs/${tabId}/discard`, {
      method: "POST", body: { reason, ...extra },
    }),
  // Undoing a bill after the money was taken — a manager's decision only.
  voidTab: (facilityId, tabId, reason) =>
    request(`/api/facilities/${facilityId}/tabs/${tabId}/void`, { method: "POST", body: { reason } }),
  // One facility's own takings, for the manager working it.
  facilitySales: (facilityId, from, to) =>
    request(`/api/facilities/${facilityId}/sales`, { params: { from, to } }),

  // pool + gym: who came in, and what they paid
  facilityVisits: (facilityId, date) =>
    request(`/api/facilities/${facilityId}/visits`, { params: { date } }),
  logFacilityVisit: (facilityId, body) =>
    request(`/api/facilities/${facilityId}/visits`, { method: "POST", body }),
  endFacilityVisit: (facilityId, visitId) =>
    request(`/api/facilities/${facilityId}/visits/${visitId}/leave`, { method: "POST" }),

  // gym subscriptions
  membershipPlans: (facilityId) => request(`/api/facilities/${facilityId}/plans`),
  addMembershipPlan: (facilityId, body) =>
    request(`/api/facilities/${facilityId}/plans`, { method: "POST", body }),
  updateMembershipPlan: (facilityId, planId, body) =>
    request(`/api/facilities/${facilityId}/plans/${planId}`, { method: "PATCH", body }),
  memberships: (facilityId) => request(`/api/facilities/${facilityId}/memberships`),
  addMembership: (facilityId, body) =>
    request(`/api/facilities/${facilityId}/memberships`, { method: "POST", body }),

  // analytics + audit
  summary: (location, days) => request("/api/analytics/summary", { params: { location, days } }),
  todaySales: (location) => request("/api/analytics/today", { params: { location } }),
  occupancy: (location, back, forward) => request("/api/analytics/occupancy", { params: { location, back, forward } }),
  compare: (days) => request("/api/analytics/compare", { params: { days } }),
  audit: (params) => request("/api/audit", { params }),

  // notifications
  notifications: (location, limit) => request("/api/notifications", { params: { location, limit } }),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: (location) =>
    request("/api/notifications/read-all", { method: "POST", body: { location } }),

  // room assignment — moves a booking, or places one that arrived paid with no room
  moveBookingRoom: (id, roomNumber, reason) =>
    request(`/api/bookings/${id}/room`, { method: "PATCH", body: { roomNumber, reason } }),

  // website content the owner publishes to the public site
  siteContent: () => request("/api/content"),
  createContent: (body) => request("/api/content", { method: "POST", body }),
  updateContent: (id, body) => request(`/api/content/${id}`, { method: "PATCH", body }),
  deleteContent: (id) => request(`/api/content/${id}`, { method: "DELETE" }),
  // A one-time permission to upload one file straight to Cloudinary. The file
  // itself never comes through here — see lib/uploadMedia.js.
  mediaUploadSignature: (mediaType) => request("/api/content/media-signature", { method: "POST", body: { mediaType } }),

  // what the website's FAQ assistant is allowed to know
  faqEntries: () => request("/api/content/faq/all"),
  createFaq: (body) => request("/api/content/faq", { method: "POST", body }),
  updateFaq: (id, body) => request(`/api/content/faq/${id}`, { method: "PATCH", body }),
  deleteFaq: (id) => request(`/api/content/faq/${id}`, { method: "DELETE" }),

  // personal to-do list — the server scopes this to the signed-in user
  todos: () => request("/api/todos"),
  createTodo: (text) => request("/api/todos", { method: "POST", body: { text } }),
  updateTodo: (id, body) => request(`/api/todos/${id}`, { method: "PATCH", body }),
  deleteTodo: (id) => request(`/api/todos/${id}`, { method: "DELETE" }),

  // assistant
  aiPrompts: () => request("/api/ai/prompts"),
  aiAsk: (body) => request("/api/ai/ask", { method: "POST", body }),
};

export default api;
