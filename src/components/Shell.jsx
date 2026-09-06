import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AskDivic from "./AskDivic";
import { useAuth } from "../context/AuthContext";
import { connectSocket, disconnectSocket } from "../lib/socket";

export default function Shell({ children }) {
  const { location, can } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [pending] = useState(0);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Re-join the property room whenever the manager switches property.
  useEffect(() => {
    connectSocket(location);
    return () => disconnectSocket();
  }, [location]);

  return (
    <div className="divic">
      <div className="shell">
        <Sidebar />
        <div className="main">
          <Topbar online={online} pending={pending} />
          <main className="body">{children}</main>
        </div>
      </div>
      {can("ai") && <AskDivic />}
    </div>
  );
}
