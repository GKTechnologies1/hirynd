import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi } from "@/services/api";
import { useNavigate } from "react-router-dom";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Briefcase, Check, X, Plus, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface CandidateRolesPageProps {
  candidate: any;
  onStatusChange: () => void;
}

const CandidateRolesPage = ({ candidate, onStatusChange }: CandidateRolesPageProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [customRole, setCustomRole] = useState({ title: "", reason: "" });

  const canConfirm = ["roles_suggested", "roles_published"].includes(candidate?.status);
  const isConfirmed = [
    "roles_candidate_responded", "roles_confirmed", "payment_pending", "payment_completed", "paid", "credentials_submitted",
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
    "roles_suggested", "roles_published", "roles_candidate_responded", "roles_confirmed", "payment_pending", "pending_payment", "payment_completed", "paid", 
    "credentials_submitted", "credential_completed", "active_marketing", "placed_closed", "placed"
  ].includes(candidate?.status);

  if (!statusAllowed) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Role suggestions will appear here once your intake form has been reviewed.</p>
          </CardContent>
        </Card>
      </div>
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
    return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading suggested roles...</p></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
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
                      <div className="ml-4 flex items-center gap-2 shrink-0">
                        {canConfirm ? (
                          <>
                            <Button
                              size="sm"
                              variant={decision === "accepted" ? "hero" : "outline"}
                              className={`h-9 px-4 font-semibold transition-all ${
                                decision === "accepted"
                                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-sm shadow-green-500/20"
                                  : "hover:border-green-500 hover:text-green-600"
                              }`}
                              onClick={() => handleDecision(role.id, "accepted")}
                            >
                              <Check className="h-4 w-4 mr-1.5" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant={decision === "declined" ? "destructive" : "outline"}
                              className={`h-9 px-4 font-semibold transition-all ${
                                decision === "declined"
                                  ? ""
                                  : "hover:border-destructive hover:text-destructive"
                              }`}
                              onClick={() => handleDecision(role.id, decision === "declined" ? "" : "declined")}
                            >
                              <X className="h-4 w-4 mr-1.5" /> Reject
                            </Button>
                          </>
                        ) : (
                          role.candidate_confirmed === true ? (
                            <Badge className="h-7 px-3 text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5" /> Accepted
                            </Badge>
                          ) : role.candidate_confirmed === false ? (
                            <Badge className="h-7 px-3 text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg gap-1.5">
                              <XCircle className="h-3.5 w-3.5" /> Rejected
                            </Badge>
                          ) : (
                            <Badge className="h-7 px-3 text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg gap-1.5">
                              Pending
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    {decision === "declined" && canConfirm && (
                      <div className="mt-3 space-y-2 animate-in slide-in-from-top-1 duration-200 border-t border-destructive/20 pt-3">
                        <Label className="text-xs text-destructive font-semibold">Reason for rejection <span className="text-muted-foreground font-normal">(optional but helpful)</span></Label>
                        <Textarea 
                          placeholder="e.g. Not relevant to my background, prefer a different industry..."
                          value={notes[role.id] || ""}
                          onChange={(e) => handleNoteChange(role.id, e.target.value)}
                          className="text-sm min-h-[70px] border-destructive/30 focus:border-destructive/60"
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
                  className={`mt-4 w-full h-11 font-bold transition-all ${allDecided ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                  onClick={handleSubmit}
                  disabled={!allDecided || submitting}
                >
                  {submitting ? "Confirming..." : "Confirm Role Selections"}
                </Button>
              )}

              {isConfirmed && (
                <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
                  <CheckCircle className="mx-auto mb-3 h-8 w-8 text-green-500" />
                  <p className="text-sm font-semibold text-green-800 mb-1">Your role selections have been confirmed!</p>
                  <p className="text-xs text-green-600 mb-4">Complete your payment to proceed with the marketing process.</p>
                  <Button 
                    variant="hero" 
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 h-11 px-8 font-bold"
                    onClick={() => navigate("/candidate-dashboard/payments")}
                  >
                    <DollarSign className="h-4 w-4 mr-2" /> Proceed to Payment
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateRolesPage;
