import { useEffect, useState } from "react";
import { notificationsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCircle } from "lucide-react";

const AdminNotificationsPage = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.list(filter === "unread");
      setNotifications(data || []);
    } catch { setNotifications([]); }
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [filter]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      toast({ title: "Marked as read" });
      fetchNotifications();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>Unread</Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications ({notifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">Loading...</p> :
           notifications.length === 0 ? <p className="text-muted-foreground text-sm">No notifications.</p> : (
            <div className="space-y-2">
              {notifications.map((n: any) => (
                <div key={n.id} className={`flex items-start justify-between rounded-xl border border-border p-3 transition-colors ${n.is_read ? "bg-background" : "bg-primary/5 border-primary/20"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg mt-0.5 ${n.is_read ? "bg-muted" : "bg-primary/10"}`}>
                      <Bell className={`h-3.5 w-3.5 ${n.is_read ? "text-muted-foreground" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${n.is_read ? "text-muted-foreground" : "text-card-foreground"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {!n.is_read && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleMarkRead(n.id)}>
                      <CheckCircle className="mr-1 h-3 w-3" /> Read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificationsPage;
