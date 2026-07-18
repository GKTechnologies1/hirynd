import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { reviewsApi } from "@/services/api";
import { StarRating } from "@/components/ui/StarRating";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, CheckCircle, XCircle, Trash2, Calendar, User, Star, ExternalLink, Clock } from "lucide-react";

export const AdminReviewsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, approved

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data } = await reviewsApi.listAdmin();
      setReviews(data || []);
    } catch (err) {
      console.error("Failed to fetch reviews for admin:", err);
      toast({
        title: "Error",
        description: "Failed to load candidate reviews.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApproveToggle = async (reviewId: string, currentStatus: boolean) => {
    try {
      const targetStatus = !currentStatus;
      await reviewsApi.manageAdmin(reviewId, { is_approved: targetStatus });
      toast({
        title: targetStatus ? "Review Approved" : "Approval Revoked",
        description: targetStatus
          ? "The review will now appear on the public reviews page."
          : "The review has been hidden from the public reviews page.",
      });
      // Refresh local list
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, is_approved: targetStatus } : r))
      );
    } catch (err) {
      console.error("Failed to toggle review approval:", err);
      toast({
        title: "Action failed",
        description: "An error occurred while updating approval status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review? This action cannot be undone.")) {
      return;
    }

    try {
      await reviewsApi.deleteAdmin(reviewId);
      toast({
        title: "Review Deleted",
        description: "The review has been permanently removed.",
      });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      console.error("Failed to delete review:", err);
      toast({
        title: "Deletion failed",
        description: "Failed to delete the review record.",
        variant: "destructive",
      });
    }
  };

  // Filtering & Search
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.candidate_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.candidate_display_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.review_text && r.review_text.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.job_title && r.job_title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && r.is_approved) ||
      (statusFilter === "pending" && !r.is_approved);

    return matchesSearch && matchesStatus;
  });

  // Counts
  const totalCount = reviews.length;
  const approvedCount = reviews.filter((r) => r.is_approved).length;
  const pendingCount = reviews.filter((r) => !r.is_approved).length;

  const cards = [
    { key: "all", label: "Total Reviews", count: totalCount, icon: <Star className="h-5 w-5 text-primary" />, color: "bg-primary/10 text-primary" },
    { key: "approved", label: "Approved Reviews", count: approvedCount, icon: <CheckCircle className="h-5 w-5 text-emerald-600" />, color: "bg-emerald-50 text-emerald-700" },
    { key: "pending", label: "Pending Approval", count: pendingCount, icon: <Clock className="h-5 w-5 text-amber-600" />, color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card
            key={c.key}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-none shadow-sm bg-card/40 backdrop-blur-md overflow-hidden ${
              statusFilter === c.key ? "ring-2 ring-primary bg-card/75" : "hover:bg-card/65"
            }`}
            onClick={() => setStatusFilter(c.key)}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.color}`}>
                {c.icon}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-card-foreground leading-none">{c.count}</p>
                <p className="text-xs text-muted-foreground mt-1.5 font-bold uppercase tracking-wider">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-border/40">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews by candidate name, email, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
        
        <div className="flex w-full md:w-auto items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Filter Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Fetching candidate reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card className="border-none shadow-sm py-16 text-center bg-card/20">
          <CardContent>
            <div className="mx-auto h-16 w-16 bg-muted/20 rounded-2xl flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground">No Reviews Found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
              There are no reviews matching your search criteria or no candidates have submitted reviews yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredReviews.map((rev) => (
            <Card key={rev.id} className="border-none shadow-md overflow-hidden bg-card/40 backdrop-blur-md hover:shadow-lg transition-shadow flex flex-col justify-between">
              <div>
                {/* Header: Candidate Details */}
                <CardHeader className="pb-3 bg-muted/10 border-b border-border/10">
                  <div className="flex items-start gap-4">
                    <div 
                      className="h-12 w-12 shrink-0 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center overflow-hidden font-bold border border-secondary/10 shadow-inner cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/admin-dashboard/candidates/${rev.candidate}`)}
                      title="Click to view candidate details"
                    >
                      {rev.candidate_avatar ? (
                        <img src={rev.candidate_avatar} alt={rev.candidate_name} className="h-full w-full object-cover" />
                      ) : (
                        rev.candidate_name?.[0]?.toUpperCase() || <User className="h-5 w-5" />
                      )}
                    </div>
                    <div 
                      className="min-w-0 flex-1 cursor-pointer group/cand"
                      onClick={() => navigate(`/admin-dashboard/candidates/${rev.candidate}`)}
                      title="Click to view candidate details"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-card-foreground truncate text-sm group-hover/cand:text-primary transition-colors">{rev.candidate_name}</h4>
                        <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase font-mono tracking-wider">
                          {rev.candidate_display_id}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate group-hover/cand:underline">{rev.candidate_email}</p>
                    </div>
                    <div>
                      {rev.is_approved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Body: Review Text & Details */}
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <StarRating rating={rev.rating} />
                    <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                      {rev.rating.toFixed(1)} / 5.0
                    </span>
                  </div>

                  {rev.job_title && (
                    <div className="text-xs font-bold text-neutral-700">
                      Review Heading: <span className="font-medium text-muted-foreground">{rev.job_title}</span>
                    </div>
                  )}

                  <p className="text-sm text-neutral-600 leading-relaxed italic bg-muted/10 p-3 rounded-xl border border-border/20">
                    "{rev.review_text}"
                  </p>

                  {rev.image_url && (
                    <div className="relative group rounded-xl border border-border overflow-hidden bg-neutral-50 max-h-48 flex items-center justify-center">
                      <img src={rev.image_url} alt="Review attachment" className="max-h-48 max-w-full object-contain" />
                      <a
                        href={rev.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 h-7 w-7 rounded-lg bg-black/70 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View Full Image"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Footer: Admin Actions */}
              <div className="p-4 border-t border-border/20 bg-muted/5 flex items-center justify-between gap-3 mt-auto">
                <div className="flex items-center text-[10px] text-muted-foreground gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(rev.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteReview(rev.id)}
                    className="h-8 px-2 text-destructive hover:bg-destructive/10 rounded-lg hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  {rev.is_approved ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveToggle(rev.id, rev.is_approved)}
                      className="h-8 text-xs font-semibold rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" /> Unapprove
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveToggle(rev.id, rev.is_approved)}
                      className="h-8 text-xs font-semibold rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default AdminReviewsPage;
