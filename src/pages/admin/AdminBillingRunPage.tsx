import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Play, Eye, AlertTriangle } from "lucide-react";

const AdminBillingRunPage = () => {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const runCheck = async (_dryRun: boolean) => {
    toast({ title: "Feature not available", description: "Automated billing runs require a scheduled task configuration.", variant: "destructive" });
  };

  const handleExecuteClick = () => {
    setConfirmText("");
    setShowConfirm(true);
  };

  const handleConfirmExecute = () => {
    setShowConfirm(false);
    setConfirmText("");
    runCheck(false);
  };

  const affected = result?.affected || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Billing Check</CardTitle>
          <CardDescription>
            Run billing checks to process expired grace periods, create overdue invoices, and send upcoming charge reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => runCheck(true)} disabled={running}>
              <Eye className="mr-2 h-4 w-4" />
              {running ? "Running..." : "Dry Run (Preview Only)"}
            </Button>
            <Button variant="hero" onClick={handleExecuteClick} disabled={running}>
              <Play className="mr-2 h-4 w-4" />
              {running ? "Running..." : "Execute Billing Checks"}
            </Button>
          </div>

          {result && (
            <div className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-card-foreground">{result.expired_grace_paused || 0}</p>
                    <p className="text-sm text-muted-foreground">Grace Periods Expired → Paused</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-card-foreground">{result.overdue_invoices_created || 0}</p>
                    <p className="text-sm text-muted-foreground">Overdue Invoices Created</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-card-foreground">{result.upcoming_reminders || 0}</p>
                    <p className="text-sm text-muted-foreground">Upcoming Reminders Sent</p>
                  </CardContent>
                </Card>
              </div>

              {result.dry_run && (
                <Badge className="bg-primary/10 text-primary">DRY RUN — No changes were made</Badge>
              )}

              {affected.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Affected Candidates</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <DataTable
                      data={affected}
                      isLoading={false}
                      searchPlaceholder="Filter candidate ID..."
                      searchKey="candidate_id"
                      emptyMessage="No candidates affected."
                      columns={[
                        { 
                          header: "Candidate ID", 
                          render: (a: any) => <span className="text-sm font-mono pl-6">{a.candidate_id?.slice(0, 8)}...</span>
                        },
                        { 
                          header: "Action", 
                          className: "pr-6 text-right",
                          render: (a: any) => (
                            <Badge className={
                              a.action === "pause_expired_grace" ? "bg-destructive/10 text-destructive" :
                              a.action === "create_overdue_invoice" ? "bg-primary/10 text-primary" :
                              "bg-secondary/10 text-secondary"
                            }>
                              {a.action.replace(/_/g, " ")}
                            </Badge>
                          )
                        }
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Billing Execution
            </DialogTitle>
            <DialogDescription>
              This will process expired grace periods, create overdue invoices, and send notifications. These changes cannot be undone. Type <strong>RUN</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Type "RUN" to confirm'
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmExecute}
              disabled={confirmText !== "RUN"}
            >
              Execute Billing Checks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBillingRunPage;
