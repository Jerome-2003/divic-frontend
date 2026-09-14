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
    section: "Dashboard",
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
    section: "Bookings",
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
    module: "frontdesk", path: "/front-desk", section: "Front desk",
    label: "Front desk",
    blurb: "Everything the desk does in a shift, on one screen — arrivals, website requests and unpaid bills.",
    features: [
      "They used to be three pages. They are one counter, so they are one screen.",
    ],
  },
  {
    module: "frontdesk", path: "/front-desk?tab=arrivals", anchor: "/front-desk",
    section: "Front desk", target: "fd-tabs",
    label: "The three room tabs",
    blurb: "Arrivals is who is due in today, Staying is who is in the building, Departures is who is due out. Each carries a live count.",
    features: [
      "Check in and Check out sit on the row itself — no need to open anything.",
      "A guest who came from the website keeps the website mark, so you know nobody has spoken to them.",
    ],
    note: "Checking out with money owing asks you to take payment first, or to override with a reason.",
  },
  {
    module: "frontdesk", path: "/front-desk", section: "Front desk", target: "fd-walkin",
    label: "Walk-in booking",
    blurb: "A guest at the counter with no reservation. Pick the dates and room type and it shows what is free.",
    features: [
      "Any discount running at this property comes off the price automatically.",
    ],
  },
  {
    module: "frontdesk", path: "/front-desk?tab=requests", anchor: "/front-desk",
    section: "Front desk", target: "fd-requests",
    optional: true,
    label: "Website requests",
    blurb: "Requests lodged on the hotel website. They hold no room until you accept one.",
    features: [
      "Accept picks the first free room of that type and turns it into a real booking.",
      "Decline asks for a reason, so you can explain it to the guest on the phone.",
      "A request already paid for online shows as booked — there is nothing to do.",
      "A dot on this tab, and on Front desk in the sidebar, means something new has come in.",
    ],
  },
  {
    module: "frontdesk", path: "/front-desk?tab=billing", anchor: "/front-desk",
    section: "Front desk", target: "fd-bills",
    optional: true,
    label: "Bills",
    blurb: "Every stay's bill, largest balance first — next to the checkout that needs it settled.",
    features: [
      "These are room bills. What a guest paid for at a bar, pool or gym till is settled there and never appears here.",
      "What they signed to their room does appear, named by the facility it came from.",
      "Bill opens the itemised version, line by line, for a guest querying a figure.",
      "Take payment records cash, card or transfer, or sends a Paystack link.",
    ],
  },
  {
    module: "rooms",
    path: "/housekeeping",
    section: "Housekeeping",
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
    section: "Guests",
    label: "Guests",
    blurb: "Look up a guest and see their full history across both properties.",
    features: [
      "Search by name, phone or email.",
      "Click a guest to see every past stay, and what they spent.",
      "Read-only — this page is for finding someone, not editing a booking.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar",
    label: "The bar till",
    blurb: "Today's orders down one side, the menu and the running bill on the other. The next few steps walk the buttons one at a time.",
    features: [
      "It works the same for a bar and for the restaurant.",
      "If you are assigned to more than one, you are asked which before you get here.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "facility-picker",
    optional: true,
    label: "Which bar are you working?",
    blurb: "Asked first if you are assigned to more than one bar, or to the restaurant as well. The rest of this page is the same for all of them.",
    features: [
      "Pick one and you can switch later from the top of the screen.",
      "A facility that is closed or under maintenance says so on its tile.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-open",
    label: "Open a table",
    blurb: "The first thing you do when a guest sits down. Give the table a name — Table 4, Bar stool 2, whatever you call it out loud.",
    features: [
      "Their room number is optional, and worth adding if they are staying here.",
      "A room added now shows on the order all evening, so whoever picks the table up knows whose it is.",
      "Nothing is charged to that room until the bill is settled.",
    ],
    note: "Greyed out when the bar is closed or under maintenance. Tables already open can still be settled.",
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-cards",
    label: "Today's orders",
    blurb: "Every order from today, newest first. One card each, showing the time, the table, the room and surname, and a coloured dot for the money.",
    features: [
      "Orange Unpaid — still open, nothing taken yet.",
      "Green Paid — settled at the till.",
      "Gold On a room — signed to a guest's bill, owed until they check out.",
      "Tap a card to open that order.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-filters",
    label: "Narrowing the list",
    blurb: "Four filters, with a live count on each. Open is the one you will live in on a busy night.",
    features: [
      "All also shows anything voided, so an order never just disappears.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-search",
    label: "Finding one order",
    blurb: "Type a table name, a room number, a surname or a receipt number.",
    features: [
      "Useful when a guest comes back an hour later asking about their bill.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-menu-grid",
    optional: true,
    hint: "Open a table, or tap one in the list, and this fills with what the bar sells.",
    label: "Adding to the order",
    blurb: "The menu, grouped into drinks, food and anything else. Tap a tile to put one on the bill.",
    features: [
      "Tap the same tile again for a second — it adds to the line rather than making a new one.",
      "An item a manager has taken off shows greyed and cannot be tapped, so you can tell a guest it is off.",
      "Prices come from the menu and are read by the server. Nothing here can set its own price.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-qty",
    optional: true,
    hint: "Add something to an order and the plus and minus appear on its line.",
    label: "Changing how many",
    blurb: "Plus and minus on each line. \"They wanted three, not one\" is the commonest correction at a bar.",
    features: [
      "Minus at one removes the line, same as the bin beside it.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-room",
    optional: true,
    hint: "Open an order to see this, at the top beside the table's name.",
    label: "Putting it on a room",
    blurb: "Attach a room to an open table, or correct the one on it. A guest who sat down as a walk-in and then says \"put it on my room\" is the ordinary case.",
    features: [
      "The guest must be checked in. You are shown their surname to say back to them before anything is charged.",
      "Attaching a room charges nothing — that happens when you settle.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-printbill",
    optional: true,
    hint: "Open an order with something on it and this sits under the bill.",
    label: "The bill, before they pay",
    blurb: "Prints the hotel's headed bill so the guest can see what they owe before handing over money.",
    features: [
      "Marked \"Bill — not yet paid\", so it can never be mistaken for a receipt.",
      "The printer dialog opens by itself; Save as PDF is in there too.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-settle",
    optional: true,
    hint: "Open an order with something on it to see the settle button.",
    label: "Taking the money",
    blurb: "Closes the table and prints the receipt. Choose charge to a room, or paying now by cash, card or transfer.",
    features: [
      "Charging a room asks for the room number and shows the surname to check.",
      "The receipt prints straight away, and can be sent as a message instead.",
      "Once settled, only a manager can undo it.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-split",
    optional: true,
    hint: "Open an order with something on it — Split sits under Settle.",
    label: "Splitting a bill",
    blurb: "Four friends where two pay cash and two sign it to their rooms, or one guest paying half now and half on the room.",
    features: [
      "Even shares fills the amounts for you; add more parts with Another.",
      "It tells you as you type whether the parts add up, and will not let you settle until they do.",
      "Each part becomes its own charge, so a guest querying their bill sees only their share.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-discard",
    optional: true,
    hint: "Open an order to find this at the bottom of the bill.",
    label: "Closing a table you should not have opened",
    blurb: "A name typed wrong, or a party that walked out before ordering. Nothing has been paid, so there is no money to reverse.",
    features: [
      "A table with items on it asks why, and the reason goes in the activity log.",
      "An already settled order cannot be discarded — a manager voids that instead.",
    ],
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-menu",
    optional: true,
    label: "The menu (managers)",
    blurb: "What this bar sells and for how much. Only a manager or the owner sees this button.",
    features: [
      "Add an item with a name, a price and whether it is a drink, food or other.",
      "Take an item off to stop it being sold without losing it from old receipts.",
    ],
    note: "Everyone else sells from the list. Prices are a manager's decision, the same as room rates.",
  },
  {
    module: "pos", path: "/bar", section: "Bar", target: "bar-takings",
    optional: true,
    label: "Takings (managers)",
    blurb: "What this one facility took — by day, by how it was paid, by who took it, and what sold most.",
    features: [
      "Today, 7, 14 or 30 days.",
      "Voided orders are left out: a sale that was undone did not happen.",
    ],
    note: "This is the bar's week. The whole hotel's month is on Records.",
  },
  {
    module: "pos",
    path: "/pool",
    section: "Pool",
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
    section: "Gym",
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
    section: "Analytics",
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
    module: "analytics", path: "/records", section: "Records",
    label: "Records",
    blurb: "The filed record of a stretch of trading — the page you print at a month end and keep.",
    features: [
      "Analytics keeps moving; this has one answer forever, so it can be filed and relied on.",
    ],
  },
  {
    module: "analytics", path: "/records", section: "Records", target: "rec-mode",
    label: "What it covers",
    blurb: "Choose the dates is the everyday one — any two days you like. A whole month and a whole year are the named periods you file.",
    features: [
      "Both days you pick are counted: the 9th to the 22nd is fourteen days.",
    ],
  },
  {
    module: "analytics", path: "/records", section: "Records", target: "rec-quick",
    optional: true,
    label: "Common stretches",
    blurb: "Today, the last week, fortnight, month or 90 days, and this month so far — one tap instead of two date pickers.",
  },
  {
    module: "analytics", path: "/records", section: "Records", target: "rec-print",
    label: "Saving the copy",
    blurb: "Prints the branded report. Every print dialog has Save as PDF as a destination, which is how you get the filed copy.",
    features: [
      "At a month or year end you are prompted to take a copy, and the prompt stops once you have.",
    ],
    note: "Revenue is what the period sold; collected is what arrived. They rarely match, and the report says why.",
  },
  {
    module: "rates", path: "/rates", section: "Rates",
    label: "Rates",
    blurb: "Nightly rates and offers for this property. Each property keeps its own pricing.",
    features: [
      "Changing a rate affects new bookings only. Bookings already taken keep the price they were quoted.",
    ],
  },
  {
    module: "rates", path: "/rates", section: "Rates", target: "rates-edit",
    optional: true,
    label: "Editing the rates",
    blurb: "Edit rates opens every room type at once; Save applies them, Discard throws the changes away.",
    note: "Manager and owner only. Everyone else can read this page but not change it.",
  },
  {
    module: "rates", path: "/rates", section: "Rates", target: "rates-discounts",
    label: "Discounts",
    blurb: "Offers against those rates. They show on the website in their own right and come off the price automatically when a guest books — online and at the desk.",
    features: [
      "A percentage off, or a flat amount off the stay — your choice per offer.",
      "Limit it to some room types, a shortest stay, or a run of arrival dates.",
      "Turn one off to stop it without losing the record of it.",
      "A stay that qualifies for more than one gets all of them.",
    ],
  },
  {
    module: "staff",
    path: "/staff",
    section: "Staff",
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
    section: "Website",
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
    section: "Activity log",
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
    section: "To-do list",
    label: "To-do list",
    blurb: "A personal task list — just for you.",
    features: [
      "Add a task and press Enter.",
      "Tick it off when it's done.",
    ],
    note: "Private — nobody else on the team can see your list.",
  },
];
