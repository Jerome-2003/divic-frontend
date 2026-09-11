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

  // rooms + rates
  rooms: (location) => request("/api/rooms", { params: { location } }),
  setRoomStatus: (id, status, note) => request(`/api/rooms/${id}/status`, { method: "PATCH", body: { status, note } }),
  availability: (location, checkIn, checkOut, roomType) =>
    request("/api/rooms/availability", { params: { location, checkIn, checkOut, roomType } }),
  rates: (location) => request("/api/rooms/rates", { params: { location } }),
  saveRates: (location, prices) => request("/api/rooms/rates", { method: "PUT", body: { location, prices } }),

  // bookings
  bookings: (location, params) => request("/api/bookings", { params: { location, ...params } }),
  createBooking: (payload) => request("/api/bookings", { method: "POST", body: payload }),
  checkIn: (id) => request(`/api/bookings/${id}/check-in`, { method: "POST" }),
  checkOut: (id, allowUnpaid) => request(`/api/bookings/${id}/check-out`, { method: "POST", body: { allowUnpaid } }),
  updateBookingDates: (id, checkIn, checkOut, reason) => request(`/api/bookings/${id}/dates`, { method: "PATCH", body: { checkIn, checkOut, reason } }),
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
  uploadContentMedia: (dataUrl, mediaType) => request("/api/content/media-upload", { method: "POST", body: { dataUrl, mediaType } }),

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
