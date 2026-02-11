import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Briefcase, Check, X } from "lucide-react";

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <span className="h-4 w-4">📋</span> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <span className="h-4 w-4">📄</span> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
];

interface CandidateRolesPageProps {
  candidate: any;
  onStatusChange: () => void;
}

const CandidateRolesPage = ({ candidate, onStatusChange }: CandidateRolesPageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, boolean | null>>({});

  const canConfirm = candidate?.status === "roles_suggested";
  const isConfirmed = ["roles_confirmed", "paid", "credential_completed", "active_marketing", "placed"].includes(candidate?.status);

  useEffect(() => {
    if (!candidate) return;
    const fetchRoles = async () => {
      const { data } = await supabase
        .from("role_suggestions")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: true });
      setRoles(data || []);
      // Pre-fill decisions if already confirmed
      const d: Record<string, boolean | null> = {};
      (data || []).forEach((r: any) => {
        d[r.id] = r.candidate_confirmed;
      });
      setDecisions(d);
      setLoading(false);
    };
    fetchRoles();
  }, [candidate]);

  const statusAllowed = ["roles_suggested", "roles_confirmed", "paid", "credential_completed", "active_marketing", "placed"].includes(candidate?.status);

  if (!statusAllowed) {
    return (
      <DashboardLayout title="Role Suggestions" navItems={CANDIDATE_NAV}>
        <Card>
          <CardContent className="p-8 text-center">
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Role suggestions will appear here once your intake form has been reviewed.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const handleDecision = (roleId: string, confirmed: boolean) => {
    if (!canConfirm) return;
    setDecisions((prev) => ({ ...prev, [roleId]: confirmed }));
  };

  const allDecided = roles.length > 0 && roles.every((r: any) => decisions[r.id] !== null && decisions[r.id] !== undefined);

  const handleSubmit = async () => {
    if (!allDecided || !canConfirm) return;
    setSubmitting(true);

    const { error } = await supabase.rpc("confirm_role_selections", {
      _candidate_id: candidate.id,
      _decisions: decisions,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: "Roles confirmed!", description: "Your selections have been saved. Next step: complete payment." });
    setSubmitting(false);
    onStatusChange();
  };

  if (loading) {
    return <DashboardLayout title="Role Suggestions" navItems={CANDIDATE_NAV}><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Role Suggestions" navItems={CANDIDATE_NAV}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Suggested Roles
            </CardTitle>
            {isConfirmed && (
              <div className="flex items-center gap-2 rounded-lg bg-secondary/10 px-3 py-1.5 text-sm text-secondary">
                <Lock className="h-4 w-4" /> Confirmed
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-muted-foreground">No roles have been suggested yet. Please wait for your team to review your intake form.</p>
          ) : (
            <div className="space-y-4">
              {roles.map((role: any) => (
                <div key={role.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-card-foreground">{role.role_title}</h4>
                    {role.description && <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {canConfirm ? (
                      <>
                        <Button
                          size="sm"
                          variant={decisions[role.id] === true ? "hero" : "outline"}
                          onClick={() => handleDecision(role.id, true)}
                        >
                          <Check className="mr-1 h-4 w-4" /> Yes
                        </Button>
                        <Button
                          size="sm"
                          variant={decisions[role.id] === false ? "destructive" : "outline"}
                          onClick={() => handleDecision(role.id, false)}
                        >
                          <X className="mr-1 h-4 w-4" /> No
                        </Button>
                      </>
                    ) : (
                      <StatusBadge status={role.candidate_confirmed ? "active" : role.candidate_confirmed === false ? "rejected" : "pending"} />
                    )}
                  </div>
                </div>
              ))}

              {canConfirm && (
                <Button
                  variant="hero"
                  className="mt-4 w-full"
                  onClick={handleSubmit}
                  disabled={!allDecided || submitting}
                >
                  {submitting ? "Confirming..." : "Confirm Role Selections"}
                </Button>
              )}

              {isConfirmed && (
                <div className="mt-4 rounded-lg bg-secondary/5 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Your role selections have been confirmed. Complete your payment to proceed.</p>
                  <Button variant="hero" className="mt-3" onClick={() => window.location.href = "/candidate-dashboard"}>
                    Back to Dashboard
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CandidateRolesPage;
