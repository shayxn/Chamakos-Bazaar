import { useState, useEffect, createContext, useContext } from "react";
import { motion } from "framer-motion";
import { User, Package, MapPin, Lock, LogOut, ArrowLeft, CheckCircle, Plus, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Customer = { id: number; name: string; email: string; phone: string | null; createdAt: string };
type Order = { id: number; orderNumber: string; status: string; total: number; createdAt: string; customerAddress?: string };
type Address = { id: number; label: string; address: string; isDefault: boolean };

export const AccountContext = createContext<{ customer: Customer | null; reload: () => void }>({ customer: null, reload: () => {} });
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const load = () => {
    fetch(`${BASE}/api/customers/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(setCustomer).catch(() => setCustomer(null));
  };
  useEffect(() => { load(); }, []);
  return <AccountContext.Provider value={{ customer, reload: load }}>{children}</AccountContext.Provider>;
}

function Tab({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${active ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
        <Icon className="h-4 w-4" /> {label}
      </div>
    </Link>
  );
}

export default function AccountPage() {
  const { customer, reload } = useAccount();
  const [location] = useLocation();
  const [tab, setTab] = useState<"profile" | "orders" | "addresses" | "password">("profile");

  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [addrForm, setAddrForm] = useState({ label: "Home", address: "", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (customer) setProfile({ name: customer.name, phone: customer.phone ?? "" });
  }, [customer]);

  useEffect(() => {
    if (tab === "orders") {
      fetch(`${BASE}/api/customers/orders`, { credentials: "include" }).then(r => r.json()).then(setOrders);
    }
    if (tab === "addresses") {
      fetch(`${BASE}/api/customers/addresses`, { credentials: "include" }).then(r => r.json()).then(setAddresses);
    }
  }, [tab]);

  const saveProfile = async () => {
    setSaving(true); setMsg("");
    const res = await fetch(`${BASE}/api/customers/me`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profile.name, phone: profile.phone || undefined }),
    });
    if (res.ok) { reload(); setMsg("Profile updated!"); }
    else setMsg("Failed to update.");
    setSaving(false);
  };

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setMsg("Passwords don't match"); return; }
    setSaving(true); setMsg("");
    const res = await fetch(`${BASE}/api/customers/change-password`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    if (res.ok) { setPwForm({ current: "", next: "", confirm: "" }); setMsg("Password changed!"); }
    else setMsg(data.error ?? "Failed.");
    setSaving(false);
  };

  const addAddress = async () => {
    if (!addrForm.address) return;
    await fetch(`${BASE}/api/customers/addresses`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addrForm),
    });
    setAddrForm({ label: "Home", address: "", isDefault: false });
    fetch(`${BASE}/api/customers/addresses`, { credentials: "include" }).then(r => r.json()).then(setAddresses);
  };

  const deleteAddress = async (id: number) => {
    await fetch(`${BASE}/api/customers/addresses/${id}`, { method: "DELETE", credentials: "include" });
    setAddresses(a => a.filter(x => x.id !== id));
  };

  const logout = async () => {
    await fetch(`${BASE}/api/customers/logout`, { method: "POST", credentials: "include" });
    reload();
    window.location.href = BASE + "/";
  };

  if (!customer) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <User className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-30" />
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">My Account</h2>
        <p className="text-muted-foreground mb-8">Sign in to view your orders, manage addresses, and more.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/account/login"><button className="px-6 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-xl">Sign In</button></Link>
          <Link href="/account/register"><button className="px-6 py-3 border border-border font-black uppercase tracking-widest text-sm rounded-xl text-muted-foreground hover:text-foreground transition-colors">Register</button></Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">My Account</h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome back, {customer.name}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-muted-foreground hover:text-destructive text-sm font-bold uppercase tracking-wider transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="space-y-1">
            {([["profile", User, "Profile"], ["orders", Package, "My Orders"], ["addresses", MapPin, "Addresses"], ["password", Lock, "Password"]] as const).map(([t, Icon, label]) => (
              <button key={t} onClick={() => { setTab(t); setMsg(""); }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all text-left ${tab === t ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="h-4 w-4 shrink-0" /> {label}
              </button>
            ))}
          </aside>

          <div className="md:col-span-3">
            {msg && <div className="mb-4 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl text-sm font-bold text-primary flex items-center gap-2"><CheckCircle className="h-4 w-4" />{msg}</div>}

            {tab === "profile" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-4">Profile Information</h2>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email</label>
                  <input value={customer.email} disabled className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone</label>
                  <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60" placeholder="+971 50..." />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </motion.div>
            )}

            {tab === "orders" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                <h2 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-4">Order History</h2>
                {orders.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground font-bold">No orders yet</p>
                    <Link href="/shop"><button className="mt-4 px-6 py-2 bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs rounded-lg">Shop Now</button></Link>
                  </div>
                ) : orders.map(o => (
                  <div key={o.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono font-black text-primary">#{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${o.status === "delivered" ? "text-green-400 bg-green-500/10 border-green-500/30" : o.status === "cancelled" ? "text-red-400 bg-red-500/10 border-red-500/30" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"}`}>
                        {o.status}
                      </span>
                    </div>
                    <p className="font-mono font-black">AED {o.total.toFixed(2)}</p>
                    <div className="flex gap-2">
                      <Link href={`/order/${o.id}`}>
                        <button className="text-xs font-bold text-primary hover:underline uppercase tracking-wider">Track →</button>
                      </Link>
                      <Link href={`/receipt/${o.id}`}>
                        <button className="text-xs font-bold text-muted-foreground hover:text-primary hover:underline uppercase tracking-wider transition-colors">Receipt</button>
                      </Link>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === "addresses" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-4">Saved Addresses</h2>
                {addresses.map(a => (
                  <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black uppercase tracking-widest">{a.label}</span>
                        {a.isDefault && <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">Default</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.address}</p>
                    </div>
                    <button onClick={() => deleteAddress(a.id)} className="text-destructive hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Add New Address</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} placeholder="Label (Home, Work...)"
                      className="px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60" />
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                      <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm(f => ({ ...f, isDefault: e.target.checked }))} />
                      Set as default
                    </label>
                  </div>
                  <textarea rows={2} value={addrForm.address} onChange={e => setAddrForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address..."
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 resize-none" />
                  <button onClick={addAddress} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-lg hover:opacity-90">
                    <Plus className="h-3.5 w-3.5" /> Add Address
                  </button>
                </div>
              </motion.div>
            )}

            {tab === "password" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-4">Change Password</h2>
                {(["current", "next", "confirm"] as const).map((k) => (
                  <div key={k} className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {k === "current" ? "Current Password" : k === "next" ? "New Password" : "Confirm New Password"}
                    </label>
                    <input type="password" value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                ))}
                <button onClick={changePassword} disabled={saving}
                  className="w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
