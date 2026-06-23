import { useState, useEffect, useMemo } from "react";
import { candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Eye, Clock, MessageSquare, CheckCircle, HelpCircle, Activity, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const AdminGeneralEnquiriesPage = () => {
  const { toast } = useToast();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await candidatesApi.generalEnquiriesList();
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
          ? response.data.results
          : [];
      setEnquiries(data);
    } catch (err: any) {
      toast({ 
        title: "Error fetching enquiries", 
        description: err.response?.data?.error || err.message, 
        variant: "destructive" 
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (enquiryId: string, newStatus: string) => {
    try {
      await candidatesApi.updateGeneralEnquiry(enquiryId, { status: newStatus });
      toast({ title: "Status updated successfully" });
      
      // Update local state to avoid refetching
      setEnquiries(prev => 
        prev.map(e => e.id === enquiryId ? { ...e, status: newStatus } : e)
      );

      if (selectedEnquiry && selectedEnquiry.id === enquiryId) {
        setSelectedEnquiry((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      toast({ 
        title: "Error updating status", 
        description: err.response?.data?.error || err.message, 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteEnquiry = async (enquiryId: string) => {
    if (!confirm("Are you sure you want to delete this enquiry?")) return;
    try {
      await candidatesApi.deleteGeneralEnquiry(enquiryId);
      toast({ title: "Enquiry deleted successfully" });
      setEnquiries(prev => prev.filter(e => e.id !== enquiryId));
      setShowDetailDialog(false);
      setSelectedEnquiry(null);
    } catch (err: any) {
      toast({ 
        title: "Error deleting enquiry", 
        description: err.response?.data?.error || err.message, 
        variant: "destructive" 
      });
    }
  };

  const stats = useMemo(() => {
    const total = enquiries.length;
    const newCount = enquiries.filter(e => e.status === "new").length;
    const inProgressCount = enquiries.filter(e => e.status === "in_progress").length;
    const resolvedCount = enquiries.filter(e => e.status === "resolved").length;

    return [
      { key: "all", label: "Total Enquiries", count: total, icon: <MessageSquare className="h-4 w-4" />, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", activeClass: "ring-2 ring-blue-500 dark:ring-blue-400 shadow-md" },
      { key: "new", label: "New", count: newCount, icon: <HelpCircle className="h-4 w-4" />, color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300", activeClass: "ring-2 ring-yellow-500 dark:ring-yellow-400 shadow-md" },
      { key: "in_progress", label: "In Progress", count: inProgressCount, icon: <Activity className="h-4 w-4" />, color: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300", activeClass: "ring-2 ring-orange-500 dark:ring-orange-400 shadow-md" },
      { key: "resolved", label: "Resolved", count: resolvedCount, icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300", activeClass: "ring-2 ring-green-500 dark:ring-green-400 shadow-md" },
    ];
  }, [enquiries]);

  const filteredEnquiries = useMemo(() => {
    if (activeFilter === "all") return enquiries;
    return enquiries.filter(e => e.status === activeFilter);
  }, [enquiries, activeFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">New</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">General Enquiries</h2>
          <p className="text-sm text-muted-foreground mt-1">Review and manage general inquiries submitted via contact forms</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <Clock className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Sync Enquiries
        </Button>
      </div>

      {/* Stats Widgets */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((w, i) => {
          const isActive = activeFilter === w.key;
          return (
            <motion.div
              key={w.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`border-0 ${w.color} cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${isActive ? w.activeClass : "opacity-75 hover:opacity-100"}`}
                onClick={() => {
                  setActiveFilter(prev => prev === w.key ? "all" : w.key);
                }}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 dark:bg-black/20">
                    {w.icon}
                  </div>
                  <div>
                    <p className="text-xl font-bold">{w.count}</p>
                    <p className="text-xs text-muted-foreground">{w.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {activeFilter !== "all" && (
        <div className="flex items-center gap-2 mb-2 animate-in fade-in duration-200">
          <span className="text-xs text-muted-foreground font-semibold">
            Filtered by Status: <span className="capitalize">{activeFilter.replace("_", " ")}</span>
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveFilter("all")} 
            className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear Filter
          </Button>
        </div>
      )}

      {/* Enquiries Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {activeFilter === "all" 
              ? "General Enquiry Records" 
              : `Enquiries - ${activeFilter === "in_progress" ? "In Progress" : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredEnquiries}
            isLoading={loading}
            searchKey="name"
            searchPlaceholder="Search enquiries by name..."
            emptyMessage="No enquiries found."
            columns={[
              { 
                header: "ID", 
                render: (e: any) => (
                  <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-mono">
                    {e.display_id || `HYREQ${String(e.seq_number || 0).padStart(4, '0')}`}
                  </span>
                ),
                sortable: true,
                accessorKey: "display_id",
                className: "text-xs pl-4"
              },
              { 
                header: "Name", 
                accessorKey: "name",
                className: "text-xs font-bold",
                sortable: true,
                render: (e: any) => (
                  <div className="flex flex-col text-left">
                    <span className="font-bold">{e.name || "—"}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{e.email}</span>
                  </div>
                )
              },
              { 
                header: "Phone", 
                accessorKey: "phone",
                className: "text-xs",
                sortable: true,
                render: (e: any) => (
                  <span className="font-mono text-xs">{e.phone || "—"}</span>
                )
              },
              { 
                header: "Message Snippet", 
                accessorKey: "message",
                className: "text-xs max-w-[200px] text-left",
                render: (e: any) => (
                  <span className="truncate block max-w-[180px] text-muted-foreground">
                    {e.message || "—"}
                  </span>
                )
              },
              {
                header: "Submitted At",
                render: (e: any) => (
                  <div className="text-[10px]">
                    <p className="font-bold">{formatDate(e.created_at)}</p>
                    <p className="opacity-50">{e.created_at ? new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</p>
                  </div>
                ),
                sortable: true,
                accessorKey: "created_at"
              },
              { 
                header: "Status", 
                render: (e: any) => (
                  <Select value={e.status} onValueChange={(val) => handleStatusChange(e.id, val)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                ),
                sortable: true,
                accessorKey: "status",
                className: "text-xs font-semibold"
              },
              { 
                header: "Actions", 
                render: (e: any) => (
                  <div className="flex gap-1 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs px-2" 
                      onClick={() => {
                        setSelectedEnquiry(e);
                        setShowDetailDialog(true);
                      }}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" 
                      onClick={() => handleDeleteEnquiry(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ),
                className: "text-xs text-right pr-4"
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Enquiry Detail Modal Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-[#0d47a1]">
              General Enquiry Detail
              <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-mono">
                {selectedEnquiry?.display_id}
              </span>
            </DialogTitle>
            <DialogDescription>
              Review the details of the submitted message.
            </DialogDescription>
          </DialogHeader>

          {selectedEnquiry && (
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Submitted By</p>
                  <p className="font-semibold text-neutral-900 text-sm mt-0.5">{selectedEnquiry.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedEnquiry.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone</p>
                  <p className="font-semibold font-mono text-neutral-900 text-sm mt-0.5">{selectedEnquiry.phone || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Submission Date</p>
                  <p className="text-xs text-neutral-900 mt-0.5">
                    {formatDate(selectedEnquiry.created_at)} at {new Date(selectedEnquiry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Current Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(selectedEnquiry.status)}
                    <Select value={selectedEnquiry.status} onValueChange={(val) => handleStatusChange(selectedEnquiry.id, val)}>
                      <SelectTrigger className="w-28 h-7 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Enquiry Message</p>
                <div className="mt-1.5 p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 max-h-60 overflow-y-auto">
                  <p className="text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                    {selectedEnquiry.message || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 text-xs gap-1 border-destructive/20"
              onClick={() => selectedEnquiry && handleDeleteEnquiry(selectedEnquiry.id)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Enquiry
            </Button>
            <Button 
              onClick={() => setShowDetailDialog(false)} 
              className="bg-[#0d47a1] text-white hover:bg-[#0d47a1]/90"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGeneralEnquiriesPage;
