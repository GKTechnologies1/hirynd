import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { reviewsApi, filesApi } from "@/services/api";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Edit2, ShieldAlert, CheckCircle2 } from "lucide-react";

export const CandidateReviewsPage = ({ candidate, onStatusChange }: { candidate: any; onStatusChange: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [exists, setExists] = useState(false);
  const [review, setReview] = useState<any>(null);

  // Form State
  const [rating, setRating] = useState<number>(0);
  const [jobTitle, setJobTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReview = async () => {
    setLoading(true);
    try {
      const { data } = await reviewsApi.getMine();
      setExists(data.exists);
      if (data.exists && data.review) {
        setReview(data.review);
        setRating(data.review.rating);
        setJobTitle(data.review.job_title || "");
        setReviewText(data.review.review_text || "");
        setImageUrl(data.review.image_url || "");
        setIsEditing(false);
      } else {
        setReview(null);
        setRating(0);
        setJobTitle("");
        setReviewText("");
        setImageUrl("");
        setIsEditing(true);
      }
    } catch (err) {
      console.error("Failed to fetch review:", err);
      toast({
        title: "Error",
        description: "Failed to load your review status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must not exceed 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data } = await filesApi.upload(file, "review_image");
      setImageUrl(data.url);
      toast({
        title: "Success",
        description: "Image uploaded successfully.",
      });
    } catch (err: any) {
      console.error("Failed to upload image:", err);
      toast({
        title: "Upload failed",
        description: err.response?.data?.error || "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    toast({
      title: "Image removed",
      description: "You can upload a different image before submitting.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating (from 0.5 to 5.0).",
        variant: "destructive",
      });
      return;
    }

    if (!reviewText.trim()) {
      toast({
        title: "Review text required",
        description: "Please write some feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        rating,
        review_text: reviewText,
        job_title: jobTitle || undefined,
        image_url: imageUrl || undefined,
      };

      await reviewsApi.createOrUpdateMine(payload);
      toast({
        title: exists ? "Review Updated" : "Review Submitted",
        description: "Your review has been saved and is now pending admin approval.",
      });
      fetchReview();
      onStatusChange();
    } catch (err: any) {
      console.error("Failed to save review:", err);
      toast({
        title: "Submission failed",
        description: err.response?.data?.error || "Failed to save your review.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Checking review status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-card-foreground">Share Your Experience</h1>
          <p className="text-muted-foreground mt-2">
            Let others know how HYRIND has helped you on your job search journey.
          </p>
        </div>
      </header>

      {/* Review Info/Status Banner */}
      {exists && !isEditing && review && (
        <Card className="border-none shadow-md overflow-hidden bg-card/40 backdrop-blur-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold">Your Review</CardTitle>
                <CardDescription>Submitted on {new Date(review.created_at).toLocaleDateString()}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {review.is_approved ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approved & Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    <ShieldAlert className="h-3.5 w-3.5" /> Pending Approval
                  </span>
                )}
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-xl" onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit Review
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {review.image_url && (
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-border">
                  <img src={review.image_url} alt="Review attachment" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <StarRating rating={review.rating} />
                  <span className="text-sm font-bold text-neutral-600">({review.rating.toFixed(1)} / 5)</span>
                </div>
                {review.job_title && (
                  <p className="text-sm font-bold text-neutral-700">Review Heading: <span className="font-normal text-muted-foreground">{review.job_title}</span></p>
                )}
                <p className="text-base text-neutral-600 leading-relaxed italic bg-muted/20 p-4 rounded-2xl border border-border/30">
                  "{review.review_text}"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Write/Edit Form */}
      {isEditing && (
        <Card className="border-none shadow-lg glass-card bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle>{exists ? "Modify Your Review" : "Write a New Review"}</CardTitle>
            <CardDescription>
              Provide rating, review heading, review content, and an optional visual highlight (like a landing announcement, offer letter segment, or a workspace photo).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-card-foreground">Your Rating</Label>
                <div className="p-3 bg-muted/30 rounded-2xl border border-border/40 inline-block">
                  <StarRating rating={rating} onChange={setRating} interactive={true} />
                </div>
                <p className="text-xs text-muted-foreground">Click stars to select. Hover to see rating value. Left half of a star gives half rating.</p>
              </div>

              {/* Review Heading */}
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-sm font-bold text-card-foreground">Review Heading / Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Outstanding recruiter support!, Landed my dream role in 6 weeks!, Optimized my resume!"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="rounded-xl h-11"
                />
                <p className="text-xs text-muted-foreground">Optional. This will be shown as a heading/title for your review on the website reviews page.</p>
              </div>

              {/* Review Text */}
              <div className="space-y-2">
                <Label htmlFor="reviewText" className="text-sm font-bold text-card-foreground">Review Content</Label>
                <Textarea
                  id="reviewText"
                  placeholder="Tell others how HYRIND assisted you in optimizing your profile, scheduling calls, managing interviews, or getting a placement..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="min-h-[140px] rounded-2xl resize-none p-4"
                  maxLength={1000}
                />
                <div className="text-right text-xs text-muted-foreground">
                  {reviewText.length}/1000 characters
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-card-foreground">Review Image (Optional)</Label>
                
                {imageUrl ? (
                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-muted/20">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-border">
                      <img src={imageUrl} alt="Review attachment" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-neutral-700">Uploaded Review Image</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="text-destructive hover:text-destructive hover:bg-destructive/15 h-8 px-2 mt-1 rounded-lg"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:bg-muted/10 transition-colors">
                    <div className="mx-auto h-12 w-12 text-muted-foreground bg-muted/20 rounded-xl flex items-center justify-center mb-3">
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6" />
                      )}
                    </div>
                    {isUploading ? (
                      <p className="text-sm font-semibold text-muted-foreground">Uploading image...</p>
                    ) : (
                      <>
                        <Label htmlFor="imageUpload" className="text-sm font-bold text-primary hover:underline cursor-pointer">
                          Upload a photo
                        </Label>
                        <span className="text-sm text-muted-foreground"> or drag & drop</span>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WEBP up to 5MB</p>
                        <input
                          id="imageUpload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border/30">
                {exists && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-6 rounded-xl font-bold order-2 sm:order-1"
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmitting || isUploading}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="hero"
                  className="h-11 px-8 rounded-xl font-bold order-1 sm:order-2 shadow-lg"
                  disabled={isSubmitting || isUploading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Review...
                    </>
                  ) : (
                    exists ? "Update Review" : "Submit Review"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
export default CandidateReviewsPage;
