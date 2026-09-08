import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS } from "../lib/constants";
import { naira, cap, prettyDate } from "../lib/format";
import { PageHead, Card, Metric, Loading, ErrorNote, Bar as ProgressBar } from "../components/ui";

const axisStyle = { fontSize: "0.6875rem", fill: "#9A9491" };
const tooltipStyle = {
  border: "1px solid #E8E2D9", borderRadius: 2, fontSize: "0.7812rem", fontFamily: "Inter",
};

export default function Analytics() {
  const { location, setLocation, canSwitchLocation } = useAuth();
  const [days, setDays] = useState(30);
  const [showBoth, setShowBoth] = useState(false);

  const { data: summary, loading, error } = useApi(() => api.summary(location, days), [location, days]);
  const { data: occ } = useApi(() => api.occupancy(location, 7, 7), [location]);
  const { data: compare } = useApi(() => api.compare(days), [days, showBoth], { skip: !showBoth });

  if (loading) return <Loading label="Working out the numbers" />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const byType = Object.entries(summary.byRoomType || {}).map(([name, v]) => ({
    name: cap(name), revenue: v.revenue, nights: v.nights,
  }));

  const trend = (occ?.nights || []).map((n) => ({
    day: prettyDate(n.date), occupancy: n.occupancyPercent, isFuture: n.isFuture,
  }));

  const sources = Object.entries(summary.bySource || {});
  const totalSourced = sources.reduce((s, [, v]) => s + v, 0);

  return (
    <>
      <PageHead title="Analytics"
        blurb="Occupancy and revenue for this property. Managers and the owner only.">
        <div style={{ display: "flex", gap: 8 }}>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 140 }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          {canSwitchLocation && (
            <button className={"btn" + (showBoth ? " btn-gold" : "")} onClick={() => setShowBoth(!showBoth)}>
              Compare properties
            </button>
          )}
        </div>
      </PageHead>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Metric accent label="Occupancy" value={summary.occupancyPercent + "%"}
          note={summary.roomNightsSold + " of " + summary.roomNightsAvailable + " room nights"} />
        <Metric label="Average daily rate" value={naira(summary.averageDailyRate)}
          note="Revenue per room night sold" />
        <Metric label="RevPAR" value={naira(summary.revPAR)} note="Revenue per available room" />
        <Metric label="Room revenue" value={naira(summary.totalRoomRevenue)}
          note={"Over the last " + days + " days"} />
      </div>

      {showBoth && compare && (
        <div style={{ marginBottom: 20 }}>
          <Card title="Both properties, side by side"
            sub="They run separately — nothing is pooled">
            <table className="tbl">
              <thead>
                <tr><th>Property</th><th>Rooms</th><th>Occupancy</th><th>ADR</th>
                    <th>RevPAR</th><th style={{ textAlign: "right" }}>Revenue</th></tr>
              </thead>
              <tbody>
                {Object.entries(compare.properties).map(([id, p]) => (
                  <tr key={id} style={{ cursor: "pointer" }} onClick={() => setLocation(id)}>
                    <td style={{ fontWeight: 500 }}>{LOCATIONS[id].name}</td>
                    <td className="mono">{p.totalRooms}</td>
                    <td className="mono">{p.occupancyPercent}%</td>
                    <td className="mono">{naira(p.averageDailyRate)}</td>
                    <td className="mono">{naira(p.revPAR)}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{naira(p.totalRoomRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <div className="grid g2">
        <Card title="Revenue by room type">
          <div style={{ padding: "16px 12px 12px", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid stroke="#F0EBE3" vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: "#E8E2D9" }} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={54}
                  tickFormatter={(v) => "₦" + Math.round(v / 1000) + "k"} />
                <Tooltip formatter={(v) => naira(v)} cursor={{ fill: "#F7F1E1" }} contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" fill="#D4AF37" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Occupancy" sub="Last week and the week ahead">
          <div style={{ padding: "16px 12px 12px", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid stroke="#F0EBE3" vertical={false} />
                <XAxis dataKey="day" tick={axisStyle} axisLine={{ stroke: "#E8E2D9" }} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40}
                  tickFormatter={(v) => v + "%"} domain={[0, 100]} />
                <Tooltip formatter={(v) => v + "%"} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="occupancy" stroke="#2C2A29" strokeWidth={2}
                  dot={{ r: 3, fill: "#D4AF37", stroke: "#D4AF37" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card title="Where bookings come from" pad>
          {sources.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--slate-soft)", margin: 0 }}>
              No bookings in this period yet.
            </p>
          ) : sources.map(([name, count]) => {
            const pct = totalSourced ? Math.round((count / totalSourced) * 100) : 0;
            return (
              <div key={name} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: 5 }}>
                  <span>{cap(name)}</span>
                  <span className="mono" style={{ color: "var(--slate-soft)" }}>{count} · {pct}%</span>
                </div>
                <ProgressBar percent={pct} />
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
