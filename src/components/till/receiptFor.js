/**
 * Everything the printed bill or receipt needs, built from a tab the screen
 * already has.
 *
 * The server sends this back when a table is settled, and that copy is the one
 * used at that moment. But an order is printed at other times too — the bill
 * before the guest pays, a second copy of a receipt after — and going back to
 * the server for a document whose every field is already on screen would be a
 * round trip that can fail while somebody is standing at the counter waiting
 * for a piece of paper.
 *
 * So the shape is defined once here and the two paths produce the same thing.
 * If they drifted, a reprinted receipt would quietly differ from the original,
 * which is the one document where that must never happen.
 */
export default function receiptFor(tab, facility, servedBy) {
  return {
    receiptNo: tab.receiptNo || null,
    facility: facility.name,
    location: facility.location,
    tableName: tab.tableName,
    guestName: tab.guestName || null,
    roomNumber: tab.roomNumber || (tab.parts || []).find((p) => p.roomNumber)?.roomNumber || null,
    lines: (tab.lines || []).map((l) => ({
      name: l.name, qty: l.qty, unitPrice: l.unitPrice, lineTotal: l.lineTotal,
    })),
    total: tab.total,
    settlement: tab.settlement,
    parts: tab.parts || [],
    // Who is accountable for the paper: the person who closed it if it is
    // closed, otherwise whoever opened the table and is working it now.
    servedBy: tab.settledBy || tab.openedBy || servedBy || "—",
    settledAt: tab.settledAt || null,
  };
}
