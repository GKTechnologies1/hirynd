import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { reviewsApi } from "@/services/api";
import { StarRating } from "@/components/ui/StarRating";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, CheckCircle, XCircle, Trash2, Calendar, User, Star, ExternalLink, Clock, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const AdminReviewsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("open"); // Default to open
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editReviewText, setEditReviewText] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const handleApproveReview = async (reviewId: string) => {
    try {
      await reviewsApi.manageAdmin(reviewId, { is_approved: true });
      toast({
        title: "Review Approved",
        description: "The review will now appear on the public reviews page.",
      });
      // Refresh local list
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, is_approved: true, status: "approved" }
            : r
        )
      );
    } catch (err) {
      console.error("Failed to approve review:", err);
      toast({
        title: "Action failed",
        description: "An error occurred while updating approval status.",
        variant: "destructive",
      });
    }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
      await reviewsApi.manageAdmin(reviewId, { is_approved: false });
      toast({
        title: "Review Rejected",
        description: "The review has been rejected and will not appear on the public reviews page.",
      });
      // Refresh local list
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, is_approved: false, status: "rejected" }
            : r
        )
      );
    } catch (err) {
      console.error("Failed to reject review:", err);
      toast({
        title: "Action failed",
        description: "An error occurred while updating rejection status.",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (rev: any) => {
    setEditingReview(rev);
    setEditRating(rev.rating);
    setEditReviewText(rev.review_text || "");
    setEditJobTitle(rev.job_title || "");
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;
    setIsSavingEdit(true);
    try {
      const { data } = await reviewsApi.manageAdmin(editingReview.id, {
        rating: editRating,
        review_text: editReviewText,
        job_title: editJobTitle,
      });
      toast({
        title: "Review Updated",
        description: "The review content has been updated successfully.",
      });
      // Update local list
      setReviews((prev) =>
        prev.map((r) => (r.id === editingReview.id ? { ...r, ...data } : r))
      );
      setEditingReview(null);
    } catch (err) {
      console.error("Failed to update review:", err);
      toast({
        title: "Update failed",
        description: "An error occurred while updating the review.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId);
    const isSoftDelete = review && review.status !== "deleted";

    const confirmMessage = isSoftDelete
      ? "Are you sure you want to delete this review? It will be moved to the Deleted section."
      : "Are you sure you want to permanently delete this review? This action cannot be undone.";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await reviewsApi.deleteAdmin(reviewId);
      if (isSoftDelete) {
        toast({
          title: "Review Deleted",
          description: "The review has been moved to the Deleted section.",
        });
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, is_approved: false, status: "deleted" } : r))
        );
      } else {
        toast({
          title: "Review Deleted",
          description: "The review has been permanently removed.",
        });
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
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
      (statusFilter === "open" && (r.status === "open" || !r.status)) ||
      (statusFilter === "approved" && r.status === "approved") ||
      (statusFilter === "rejected" && (r.status === "rejected" || r.status === "unapproved")) ||
      (statusFilter === "deleted" && r.status === "deleted");

    return matchesSearch && matchesStatus;
  });

  // Counts
  const totalCount = reviews.length;
  const openCount = reviews.filter((r) => r.status === "open" || !r.status).length;
  const approvedCount = reviews.filter((r) => r.status === "approved").length;
  const rejectedCount = reviews.filter((r) => r.status === "rejected" || r.status === "unapproved").length;
  const deletedCount = reviews.filter((r) => r.status === "deleted").length;

  const cards = [
    { key: "all", label: "Total Reviews", count: totalCount, icon: <Star className="h-5 w-5 text-primary" />, color: "bg-primary/10 text-primary" },
    { key: "open", label: "Open Reviews", count: openCount, icon: <Clock className="h-5 w-5 text-amber-500" />, color: "bg-amber-50 text-amber-600" },
    { key: "approved", label: "Approved", count: approvedCount, icon: <CheckCircle className="h-5 w-5 text-emerald-600" />, color: "bg-emerald-50 text-emerald-700" },
    { key: "rejected", label: "Rejected", count: rejectedCount, icon: <XCircle className="h-5 w-5 text-rose-600" />, color: "bg-rose-50 text-rose-700" },
    { key: "deleted", label: "Deleted", count: deletedCount, icon: <Trash2 className="h-5 w-5 text-neutral-500" />, color: "bg-neutral-100 text-neutral-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {cards.map((c) => (
          <Card
            key={c.key}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-none shadow-sm bg-card/40 backdrop-blur-md overflow-hidden ${
              statusFilter === c.key ? "ring-2 ring-primary bg-card/75" : "hover:bg-card/65"
            }`}
            onClick={() => setStatusFilter(c.key)}
          >
            <CardContent className="flex flex-col items-center justify-center text-center gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                {c.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-card-foreground leading-none">{c.count}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider">{c.label}</p>
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
              <SelectItem value="all">Total Reviews</SelectItem>
              <SelectItem value="open">Open Reviews</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
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
                      {rev.status === "deleted" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                          Deleted
                        </span>
                      ) : rev.is_approved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          Live
                        </span>
                      ) : (rev.status === "unapproved" || rev.status === "rejected") ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                          Open
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
                  {rev.status !== "deleted" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(rev)}
                      className="h-8 px-2 text-primary hover:bg-primary/10 rounded-lg hover:text-primary"
                      title="Edit Review"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteReview(rev.id)}
                    className="h-8 px-2 text-destructive hover:bg-destructive/10 rounded-lg hover:text-destructive"
                    title={rev.status === "deleted" ? "Permanently Delete" : "Delete"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  {rev.status === "deleted" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveReview(rev.id)}
                      className="h-8 text-xs font-semibold rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve / Restore
                    </Button>
                  ) : (
                    <>
                      {rev.status !== "approved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveReview(rev.id)}
                          className="h-8 text-xs font-semibold rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve
                        </Button>
                      )}
                      {rev.status !== "rejected" && rev.status !== "unapproved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectReview(rev.id)}
                          className="h-8 text-xs font-semibold rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Review Dialog */}
      <Dialog open={!!editingReview} onOpenChange={(open) => !open && setEditingReview(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Rating</label>
              <div className="flex items-center gap-2">
                <StarRating rating={editRating} onChange={setEditRating} interactive={true} />
                <span className="text-sm font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                  {editRating.toFixed(1)} / 5.0
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Review Heading</label>
              <Input
                value={editJobTitle}
                onChange={(e) => setEditJobTitle(e.target.value)}
                placeholder="Review Heading / Job Title"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Review Text</label>
              <textarea
                value={editReviewText}
                onChange={(e) => setEditReviewText(e.target.value)}
                placeholder="Write your review details here..."
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReview(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="rounded-xl">
              {isSavingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminReviewsPage;
