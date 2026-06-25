import { useState } from "react";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

import { Flame } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const { data: user } = useGetMe({ query: { retry: false, queryKey: ["auth", "me-login"] } });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  if (user?.isAdmin) return <Redirect href="/admin" />;
  if (user && !user.isAdmin) return <Redirect href="/" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          if (data.isAdmin) setLocation("/admin");
          else setLocation("/");
        },
        onError: () => {
          toast({ title: "Login failed", description: "Invalid credentials.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated fire glow background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.04, 0.09, 0.04] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: "radial-gradient(ellipse at 50% 60%, #ff6600, transparent 70%)" }}
      />

      {/* Floating fire particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 4 + i * 2,
            height: 4 + i * 2,
            left: `${20 + i * 15}%`,
            bottom: `${5 + i * 8}%`,
            background: i % 2 === 0 ? "#ff6600" : "#ffcc00",
            boxShadow: `0 0 10px ${i % 2 === 0 ? "#ff6600" : "#ffcc00"}`,
          }}
          animate={{ y: [0, -(80 + i * 30), 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: 2.5 + i * 0.5, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-card border border-border/60 p-8 rounded-xl shadow-[0_0_60px_rgba(255,102,0,0.1)] relative z-10"
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 fire-gradient rounded-t-xl" />

        <div className="flex justify-center mb-8">
          <img src="/chamak-logo.png" alt="Chamak Street" className="h-16 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-2 justify-center mb-8">
          <Flame className="h-4 w-4 text-primary" />
          <h1 className="text-xl font-black uppercase tracking-[0.2em]">Admin Access</h1>
          <Flame className="h-4 w-4 text-primary" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 bg-background border-border focus-visible:ring-primary focus-visible:border-primary transition-colors"
              data-testid="input-username"
              autoComplete="username"
            />
          </motion.div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22 }}
          >
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-background border-border focus-visible:ring-primary focus-visible:border-primary transition-colors"
              data-testid="input-password"
              autoComplete="current-password"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                className="w-full h-13 font-black uppercase tracking-widest fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,102,0,0.5)] transition-all py-3"
                disabled={login.isPending}
                data-testid="button-login"
              >
                {login.isPending ? (
                  <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                    Verifying...
                  </motion.span>
                ) : (
                  "Enter Drop Zone"
                )}
              </Button>
            </motion.div>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
