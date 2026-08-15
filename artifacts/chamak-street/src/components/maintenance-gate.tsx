import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/settings`, { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then((d: Record<string, string>) => { setMaintenance(d.maintenance_mode === "true"); setChecked(true); })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) return null;
  if (!maintenance) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
        <div className="text-7xl mb-6">🔧</div>
        <h1 className="font-black text-3xl mb-2">We'll Be Back Shortly</h1>
        <p className="text-muted-foreground max-w-xs mx-auto mb-8">FirstPick is currently undergoing maintenance. Check back soon!</p>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.4 }}
              className="w-2 h-2 rounded-full bg-primary" />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
