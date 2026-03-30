import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Briefcase, Check, X, MessageSquare, Plus, LayoutDashboard, FileText, KeyRound, DollarSign, CreditCard, ClipboardList, Phone, UserPlus, Settings } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Sheet", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Billing", path: "/candidate-dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Phone className="h-4 w-4" /> },
  { label: "Referral", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Messages", path: "/candidate-dashboard/messages", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Settings", path: "/candidate-dashboard/settings", icon: <Settings className="h-4 w-4" /> },
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
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [customRole, setCustomRole] = useState({ title: "", reason: "" });

  const canConfirm = ["roles_suggested", "roles_published"].includes(candidate?.status);
  const isConfirmed = [
    "roles_confirmed", "payment_completed", "paid", "credentials_submitted",
    "credential_completed", "active_marketing", "placed_closed", "placed"
  ].includes(candidate?.status);

  useEffect(() => {
    if (!candidate) return;
    const fetchRoles = async () => {
      try {
        const { data } = await candidatesApi.getRoles(candidate.id);
        setRoles(data || []);
        const d: Record<string, string> = {};
        const n: Record<string, string> = {};
        (data || []).forEach((r: any) => { 
          d[r.id] = r.candidate_confirmed === true ? "accepted" : r.candidate_confirmed === false ? "declined" : "";
          n[r.id] = r.change_request_note || "";
        });
        setDecisions(d);
        setNotes(n);
      } catch {
        setRoles([]);
      }
      setLoading(false);
    };
    fetchRoles();
  }, [candidate?.id]); // Also updated to depend on candidate.id

  const statusAllowed = [
    "roles_suggested", "roles_published", "roles_confirmed", "payment_completed", "paid", 
    "credentials_submitted", "credential_completed", "active_marketing", "placed_closed", "placed"
  ].includes(candidate?.status);

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

  const handleDecision = (roleId: string, decision: string) => {
    if (!canConfirm) return;
    setDecisions((prev) => ({ ...prev, [roleId]: decision }));
  };

  const handleNoteChange = (roleId: string, note: string) => {
    setNotes((prev) => ({ ...prev, [roleId]: note }));
  };

  const allDecided = roles.length > 0 && roles.every((r: any) => !!decisions[r.id]);

  const handleSubmit = async () => {
    if (!allDecided || !canConfirm) return;
    setSubmitting(true);

    try {
      await candidatesApi.confirmRoles(candidate.id, {
        decisions,
        notes,
        custom_role: customRole.title ? customRole : null
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
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
              {roles.map((role: any) => {
                const decision = decisions[role.id];
                return (
                  <div key={role.id} className="space-y-4 rounded-xl border border-border p-5 bg-card/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg text-card-foreground">{role.role_title}</h4>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-secondary/10 px-1.5 py-0.5 rounded">
                            Suggested by {role.suggested_by_name || "Admin"}
                          </span>
                        </div>
                        {role.description && <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>}
                        {role.admin_note && (
                          <div className="mt-2 text-xs italic text-secondary">
                            <strong>Note:</strong> {role.admin_note}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-1.5 shrink-0">
                        {canConfirm ? (
                          <>
                            <Button
                              size="sm"
                              variant={decision === "accepted" ? "hero" : "outline"}
                              className="h-8 px-2.5"
                              onClick={() => handleDecision(role.id, "accepted")}
                              title="Accept"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={decision === "declined" ? "destructive" : "outline"}
                              className="h-8 px-2.5"
                              onClick={() => handleDecision(role.id, "declined")}
                              title="Decline"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={decision === "change_requested" ? "accent" : "outline"}
                              className="h-8 px-2.5"
                              onClick={() => handleDecision(role.id, "change_requested")}
                              title="Request Change"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <StatusBadge status={role.candidate_confirmed ? "active" : role.candidate_confirmed === false ? "rejected" : "pending"} />
                        )}
                      </div>
                    </div>

                    {decision === "change_requested" && canConfirm && (
                      <div className="mt-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
                        <Label className="text-xs">Reason for change / Feedback</Label>
                        <Textarea 
                          placeholder="What would you like to change about this role suggestion?"
                          value={notes[role.id] || ""}
                          onChange={(e) => handleNoteChange(role.id, e.target.value)}
                          className="text-sm min-h-[80px]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Propose Custom Role */}
              {canConfirm && (
                <div className="mt-6 space-y-4 rounded-xl border border-dashed border-secondary/30 p-5 bg-secondary/5">
                  <div className="flex items-center gap-2 text-secondary">
                    <Plus className="h-4 w-4" />
                    <h4 className="font-semibold">Propose a Custom Role</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">Is there another role you'd like us to consider for your marketing? Propose it here.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Role Title</Label>
                      <Input 
                        placeholder="e.g. Senior Product Manager" 
                        value={customRole.title}
                        onChange={(e) => setCustomRole({...customRole, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Reason / Context</Label>
                      <Input 
                        placeholder="Why is this role a good fit?" 
                        value={customRole.reason}
                        onChange={(e) => setCustomRole({...customRole, reason: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

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
