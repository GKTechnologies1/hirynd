import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const RecruiterLogin = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setSubmitting(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/recruiter-dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUp(regEmail, regPassword, regName);
    setSubmitting(false);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registration successful", description: "Please check your email to verify your account." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center py-20">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 card-elevated">
          <h1 className="mb-2 text-2xl font-bold text-card-foreground">Recruiter Portal</h1>
          <p className="mb-6 text-sm text-muted-foreground">Access the recruiter dashboard</p>
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div><Label>Email</Label><Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required /></div>
                <div><Label>Password</Label><Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required /></div>
                <Button variant="hero" className="w-full" disabled={submitting}>{submitting ? "Signing in..." : "Sign In"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 pt-4">
                <div><Label>Full Name</Label><Input value={regName} onChange={e => setRegName(e.target.value)} required /></div>
                <div><Label>Email</Label><Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required /></div>
                <div><Label>Password</Label><Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required minLength={6} /></div>
                <Button variant="hero" className="w-full" disabled={submitting}>{submitting ? "Registering..." : "Create Account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RecruiterLogin;
