/**
 * Content for the guided tour (TutorialContext / TutorialOverlay).
 *
 * One entry per page, in the same order and keyed by the same `module`
 * permission as Sidebar's own ITEMS list — deliberately kept as a separate
 * array rather than importing Sidebar's, so a change to the tour's wording
 * can never accidentally touch the real nav. The two lists have to be kept
 * in sync by hand when a page is added or removed.
 */
export const TOUR_STEPS = [
  {
    module: "dashboard",
    path: "/",
    label: "Dashboard",
    blurb: "Your daily snapshot of the property — who's coming, who's leaving, and what needs doing.",
    features: [
      "Occupancy, arrivals, departures and rooms to clean, at a glance.",
      "Today's sales and outstanding balances, if you can see money figures.",
      "The arrivals card jumps straight to Front desk to check someone in.",
      "Rooms needing attention jumps straight to Housekeeping.",
    ],
  },
  {
    module: "bookings",
    path: "/bookings",
    label: "Bookings",
    blurb: "Every reservation at this property, searchable and editable in one table.",
    features: [
      "New booking creates a reservation for a guest.",
      "Search by guest name, phone, reference or room.",
      "Filter by status — arriving, staying, checked out, cancelled.",
      "Move a guest to a different room, or edit their dates, right from the row.",
    ],
    note: "A banner flags anyone who paid online but hasn't been placed in a room yet.",
  },
  {
    module: "frontdesk",
    path: "/front-desk",
    label: "Front desk",
    blurb: "The daily check-in and check-out desk.",
    features: [
      "Walk-in booking, for a guest without a reservation.",
      "Arrivals, Staying and Departures tabs, each with a live count.",
      "Check in and Check out buttons appear right where you need them.",
      "Website requests and Bills are tabs here too — the next two stops.",
    ],
    note: "Checking out with an unpaid bill asks you to take payment first, or override with a reason.",
  },
  {
    module: "bookings",
    path: "/front-desk?tab=requests",
    // The tour points at the sidebar, and this tab has no sidebar entry of its
    // own — it belongs to the front desk, so it spotlights the front desk.
    anchor: "/front-desk",
    label: "Website requests",
    blurb: "A tab on the front desk: booking requests submitted on the hotel website, before they become real bookings. Every row carries the website mark, so you can never mistake one for a guest with a room.",
    features: [
      "Accept assigns the first free room of that type and confirms the booking.",
      "Decline asks for a reason, so you can explain it to the guest by phone.",
      "A request already paid for online shows as booked automatically — nothing to do.",
    ],
  },
  {
    module: "rooms",
    path: "/housekeeping",
    label: "Housekeeping",
    blurb: "The live room board — what's clean, what's occupied, what needs attention.",
    features: [
      "Click any room to see who's in it and change its status.",
      "Available, Occupied, Needs cleaning and Out of order counts at the top.",
      "Leave a note for the next person, right on the room.",
    ],
    note: "Housekeeping accounts see cleaning statuses only — marking a room Out of order is a manager call.",
  },
  {
    module: "guests",
    path: "/guests",
    label: "Guests",
    blurb: "Look up a guest and see their full history across both properties.",
    features: [
      "Search by name, phone or email.",
      "Click a guest to see every past stay, and what they spent.",
      "Read-only — this page is for finding someone, not editing a booking.",
    ],
  },
  {
    module: "billing",
    path: "/front-desk?tab=billing",
    anchor: "/front-desk",
    label: "Bills",
    blurb: "A tab on the front desk: every stay's bill, and what's still owed — next to the checkout that needs it settled.",
    features: [
      "Sorted by the largest balance first, so nothing slips.",
      "These are room bills. What a guest paid for at the bar, pool or gym till is settled there and never appears here.",
      "What they signed to their room does appear, named by the facility it came from.",
      "Bill opens the itemised version, line by line, for a guest querying a figure.",
      "Take payment records cash, card or transfer — or sends a Paystack link.",
    ],
  },
    {
    module: "pos",
    path: "/bar",
    label: "Bar",
    blurb: "The till at a bar or the restaurant: today's orders down one side, the menu and the running bill on the other.",
    features: [
      "Open a table when a guest sits down — with their room, if they are staying here.",
      "Tap items onto the order; the plus and minus set how many.",
      "Filter by Open, On a room or Paid, or search a table, room or surname.",
      "Settle to one payment, or split the bill across people and methods.",
      "Close a table without settling when it was opened by mistake or the party left.",
      "Print the bill on headed paper before they pay, and the receipt after — both carry the logo.",
      "A receipt can be printed again later, or sent as text for the guest's phone.",
    ],
    note: "The menu is a manager's to write — items and prices alike. Everyone else sells from it. Only a manager can undo a bill after the money is taken.",
  },
  {
    module: "pos",
    path: "/pool",
    label: "Pool",
    blurb: "Who is in the pool, and what they paid to be there.",
    features: [
      "Log a guest in as they arrive and take the entry fee.",
      "Mark them Left when they go, so 'inside now' stays honest.",
      "The fee is set per person by a manager — it isn't typed in here.",
    ],
  },
  {
    module: "pos",
    path: "/gym",
    label: "Gym",
    blurb: "Day visitors and paying members.",
    features: [
      "Today: the same come-and-go log the pool keeps.",
      "Members: who is on a subscription, and when each term runs out.",
      "Signing someone up starts their term today and takes the payment.",
    ],
    note: "Only Divic Urban has a gym.",
  },
  {
    module: "analytics",
    path: "/analytics",
    label: "Analytics",
    blurb: "Revenue and occupancy reporting — for managers and the owner.",
    features: [
      "Pick a date range: 7, 30, 90 days, or the last year.",
      "Occupancy, average daily rate, RevPAR and total revenue at a glance.",
      "Charts break revenue down by room type and by facility.",
    ],
    note: "Compare properties is there if you work across both branches.",
  },
  {
    module: "analytics",
    path: "/records",
    label: "Records",
    blurb: "The filed record of a month or a whole year — the page you print at a month end.",
    features: [
      "Pick a month, or a whole year broken down month by month.",
      "Room revenue, bar/pool/gym takings and money collected, on one sheet.",
      "Both properties together and each on its own, if you oversee both.",
      "Save as PDF or print produces the branded document, ready to file.",
    ],
    note: "Revenue is what the period sold; collected is what actually arrived. They rarely match, and the report says why.",
  },
  {
    module: "rates",
    path: "/rates",
    label: "Rates",
    blurb: "The nightly rate for each room type at this property.",
    features: [
      "A rate change only affects new bookings — nothing already taken changes.",
    ],
    note: "Only managers and the owner can edit; everyone else sees rates here read-only.",
  },
  {
    module: "staff",
    path: "/staff",
    label: "Staff",
    blurb: "Staff accounts — logins, roles and what each person can access.",
    features: [
      "Add staff sets up a sign-in and chooses their role and permissions.",
      "Edit updates anyone's details or access, any time.",
      "Deactivate signs someone out immediately and blocks them from logging back in.",
    ],
  },
  {
    module: "content",
    path: "/website",
    label: "Website",
    blurb: "What the public hotel website shows — promos, popups and FAQ answers.",
    features: [
      "Promos & popups: write and publish banners guests see on the site.",
      "FAQ answers: what the website's assistant tells guests who ask a question.",
      "A live preview shows roughly how each one will look before you publish.",
    ],
    note: "Everything here is public the moment you publish it.",
  },
  {
    module: "audit",
    path: "/activity",
    label: "Activity log",
    blurb: "Every change made in the system — bookings, rooms, rates, payments — and who made it.",
    features: [
      "Filter by property, or by what kind of thing changed.",
      "Each entry reads in plain English: who did what, and when.",
    ],
  },
  {
    module: "todos",
    path: "/todos",
    label: "To-do list",
    blurb: "A personal task list — just for you.",
    features: [
      "Add a task and press Enter.",
      "Tick it off when it's done.",
    ],
    note: "Private — nobody else on the team can see your list.",
  },
];
