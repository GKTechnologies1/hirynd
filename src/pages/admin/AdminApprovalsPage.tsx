import { useEffect, useState } from "react";
import { authApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface PendingUser {
  id: string;
  email: string;
  role: string;
  approval_status: string;
  created_at: string;
  profile?: {
    full_name: string;
    phone: string | null;
  };
}

const AdminApprovalsPage = () => {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.pendingApprovals();
      setPending(data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (userId: string, action: "approved" | "rejected") => {
    setProcessing(userId);
    try {
      await authApi.approveUser(userId, action);
      toast({ title: action === "approved" ? "User Approved" : "User Rejected" });
      fetchPending();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Pending Approvals ({pending.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          data={pending}
          isLoading={loading}
          searchPlaceholder="Search by email..."
          searchKey="email"
          emptyMessage="No pending registrations."
          columns={[
            { 
              header: "Name", 
              render: (u: any) => <span className="font-medium text-sm pl-6">{u.profile?.full_name || "—"}</span>
            },
            { 
              header: "Email", 
              accessorKey: "email",
              className: "text-sm"
            },
            { 
              header: "Phone", 
              render: (u: any) => <span className="text-sm">{u.profile?.phone || "—"}</span>
            },
            { 
              header: "Role", 
              render: (u: any) => <Badge variant="secondary" className="text-xs uppercase">{u.role}</Badge>
            },
            { 
              header: "Registered", 
              render: (u: any) => <span className="text-sm">{format(new Date(u.created_at), "MMM d, yyyy")}</span>
            },
            { 
              header: "Actions", 
              className: "pr-6",
              render: (u: any) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="default" className="h-8 text-xs" disabled={processing === u.id}
                    onClick={() => handleAction(u.id, "approved")}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 text-xs" disabled={processing === u.id}
                    onClick={() => handleAction(u.id, "rejected")}>
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )
            }
          ]}
        />
      </CardContent>

    </Card>
  );
};

export default AdminApprovalsPage;
