import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";
import PasswordField from "@/components/auth/PasswordField";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Please enter email and password", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error, user: loggedUser } = await signIn(email, password);
    
    if (error) {
      setSubmitting(false);
      const msg = typeof error === "string" ? error : (error.error || error.detail || "Invalid email or password.");
      toast({
        title: "Login failed",
        description: msg,
        variant: "destructive",
      });
    } else if (loggedUser?.role !== "admin") {
      await signOut();
      setSubmitting(false);
      toast({ title: "Access denied", description: "Insufficient permissions.", variant: "destructive" });
    } else {
      setSubmitting(false);
      navigate("/admin-dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center py-20 px-4">
        <div className="mx-auto w-full max-w-md">
          {/* Icon badge */}
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 ring-2 ring-secondary/20">
              <ShieldCheck className="h-8 w-8 text-secondary" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 card-elevated">
            <h1 className="mb-1 text-2xl font-bold text-card-foreground text-center">Admin Portal</h1>
            <p className="mb-8 text-sm text-muted-foreground text-center">Internal access only · Hyrind</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@hyrind.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <PasswordField
                id="password"
                label="Password"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword(p => !p)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Signing in..." : "Sign In to Admin"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Not an admin?{" "}
              <Link to="/candidate-login" className="text-secondary hover:underline">Candidate Login</Link>
              {" · "}
              <Link to="/recruiter-login" className="text-secondary hover:underline">Recruiter Login</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminLogin;

