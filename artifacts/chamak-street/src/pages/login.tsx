import { useState } from "react";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/image_1778934887293.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const { data: user } = useGetMe({ query: { retry: false } });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  if (user?.isAdmin) {
    return <Redirect href="/admin" />;
  }
  if (user && !user.isAdmin) {
    return <Redirect href="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          if (data.isAdmin) {
            setLocation("/admin");
          } else {
            setLocation("/");
          }
        },
        onError: () => {
          toast({
            title: "Login failed",
            description: "Invalid credentials.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 fire-gradient opacity-5 blur-3xl rounded-full scale-150 transform -translate-y-1/2"></div>
      
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-2xl relative z-10">
        <div className="flex justify-center mb-8">
          <img src={logoPath} alt="Logo" className="h-12 object-contain" />
        </div>
        
        <h1 className="text-2xl font-black uppercase tracking-wider text-center mb-8">Admin Access</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Username</label>
            <Input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="h-12 bg-background border-border focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</label>
            <Input 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="h-12 bg-background border-border focus-visible:ring-primary"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 font-bold uppercase tracking-widest fire-gradient border-none"
            disabled={login.isPending}
          >
            {login.isPending ? "Verifying..." : "Enter Drop Zone"}
          </Button>
        </form>
      </div>
    </div>
  );
}
