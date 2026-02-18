import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Calendar, MousePointer, Mail } from "lucide-react";

const AdminConfigPage = () => {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [trainingClicks, setTrainingClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const CONFIG_KEYS = [
    { key: "admin_notification_email", label: "Admin Notification Email(s) (comma-separated)" },
    { key: "cal_screening_practice", label: "Screening Practice Cal.com URL" },
    { key: "cal_interview_training", label: "Interview Training Cal.com URL" },
    { key: "cal_operations_call", label: "Operations Call Cal.com URL" },
    { key: "default_grace_period_days", label: "Default Grace Period (days)" },
    { key: "subscription_amount_default", label: "Default Subscription Amount ($)" },
    { key: "allow_auto_resume_after_payment", label: "Auto Resume After Payment (true/false)" },
    { key: "email_admin_on_daily_logs", label: "Email Admin on Daily Logs (true/false)" },
    { key: "email_admin_on_interview_logs", label: "Email Admin on Interview Logs (true/false)" },
  ];

  const fetchData = async () => {
    const { data: configData } = await supabase
      .from("admin_config")
      .select("config_key, config_value");
    if (configData) {
      const map: Record<string, string> = {};
      configData.forEach((c: any) => { map[c.config_key] = c.config_value; });
      setConfigs(map);
    }

    // Fetch recent training clicks (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: clicks } = await supabase
      .from("training_clicks")
      .select("*")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });

    if (clicks && clicks.length > 0) {
      const candidateIds = [...new Set(clicks.map((c: any) => c.candidate_id))];
      const { data: cands } = await supabase.from("candidates").select("id, user_id").in("id", candidateIds);
      if (cands) {
        const userIds = cands.map((c: any) => c.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const enriched = clicks.map((click: any) => {
          const cand = cands.find((c: any) => c.id === click.candidate_id);
          const profile = profiles?.find((p: any) => p.user_id === cand?.user_id);
          return { ...click, candidate_name: profile?.full_name || "Unknown" };
        });
        setTrainingClicks(enriched);
      }
    } else {
      setTrainingClicks([]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    for (const item of CONFIG_KEYS) {
      const value = configs[item.key] || "";
      await supabase
        .from("admin_config")
        .upsert({ config_key: item.key, config_value: value, updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    }
    toast({ title: "Configuration saved" });
    setSaving(false);
  };

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const clicksLast7 = trainingClicks.filter(c => c.created_at >= sevenDaysAgo);
  const clicksLast30 = trainingClicks;

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Cal.com Training URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONFIG_KEYS.map((item) => (
            <div key={item.key}>
              <Label>{item.label}</Label>
              <Input
                value={configs[item.key] || ""}
                onChange={e => setConfigs(prev => ({ ...prev, [item.key]: e.target.value }))}
                placeholder="https://cal.com/..."
              />
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Configuration"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setSendingTest(true);
                const { error } = await supabase.functions.invoke("send-transactional-email", {
                  body: {
                    type: "subscription_created_admin",
                    payload: { name: "Test Candidate", email: "test@example.com", amount: "99" },
                  },
                });
                toast({
                  title: error ? "Test email failed" : "Test email sent",
                  description: error ? error.message : `Sent to ${configs["admin_notification_email"] || "configured admin email"}`,
                  variant: error ? "destructive" : "default",
                });
                setSendingTest(false);
              }}
              disabled={sendingTest}
            >
              <Mail className="mr-2 h-4 w-4" /> {sendingTest ? "Sending..." : "Send Test Admin Email"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MousePointer className="h-5 w-5" /> Training Link Clicks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-6 text-sm">
            <span className="text-muted-foreground">Last 7 days: <strong className="text-card-foreground">{clicksLast7.length}</strong></span>
            <span className="text-muted-foreground">Last 30 days: <strong className="text-card-foreground">{clicksLast30.length}</strong></span>
          </div>
          {trainingClicks.length === 0 ? (
            <p className="text-muted-foreground">No training link clicks recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Training Type</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingClicks.slice(0, 50).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.candidate_name}</TableCell>
                    <TableCell className="capitalize">{c.training_type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminConfigPage;
