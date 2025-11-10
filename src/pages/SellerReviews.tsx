import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Search, Filter, Download, Flag, Reply, TrendingUp } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  customer_id: string;
  booking_id: string;
  reply?: {
    id: string;
    reply_text: string;
    created_at: string;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: { [key: number]: number };
}

export default function SellerReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportDialog, setReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  useEffect(() => {
    if (providerId) {
      fetchReviews();
    }
  }, [providerId]);

  useEffect(() => {
    filterReviews();
  }, [reviews, searchQuery, ratingFilter]);

  const fetchProviderProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: provider } = await supabase
      .from("home_service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (provider) {
      setProviderId(provider.id);
    }
  };

  const fetchReviews = async () => {
    if (!providerId) return;

    setLoading(true);
    try {
      const { data: reviewsData, error } = await supabase
        .from("home_service_reviews")
        .select(`
          *,
          review_replies:review_replies(
            id,
            reply_text,
            created_at
          )
        `)
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedReviews = reviewsData?.map(review => ({
        ...review,
        reply: review.review_replies?.[0],
      })) || [];

      setReviews(processedReviews);
      calculateStats(processedReviews);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    const total = reviewsData.length;
    if (total === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      });
      return;
    }

    const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    reviewsData.forEach(review => {
      breakdown[review.rating as keyof typeof breakdown]++;
    });

    setStats({
      averageRating: sum / total,
      totalReviews: total,
      ratingBreakdown: breakdown,
    });
  };

  const filterReviews = () => {
    let filtered = [...reviews];

    if (searchQuery) {
      filtered = filtered.filter(review =>
        review.review_text?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (ratingFilter !== "all") {
      filtered = filtered.filter(review => review.rating === parseInt(ratingFilter));
    }

    setFilteredReviews(filtered);
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim() || !providerId) return;

    try {
      const { error } = await supabase
        .from("review_replies")
        .insert({
          review_id: reviewId,
          seller_id: providerId,
          reply_text: replyText,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reply posted successfully",
      });

      setReplyText("");
      setSelectedReview(null);
      fetchReviews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReport = async () => {
    if (!selectedReview || !reportReason) return;

    try {
      const { error } = await supabase
        .from("reported_reviews")
        .insert({
          review_id: selectedReview.id,
          reported_by: providerId,
          reason: reportReason,
          details: reportDetails,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review reported successfully",
      });

      setReportDialog(false);
      setReportReason("");
      setReportDetails("");
      setSelectedReview(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Customer Reviews Report", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Average Rating: ${stats.averageRating.toFixed(1)} / 5.0`, 14, 30);
    doc.text(`Total Reviews: ${stats.totalReviews}`, 14, 37);
    
    const tableData = filteredReviews.map(review => [
      new Date(review.created_at).toLocaleDateString(),
      "⭐".repeat(review.rating),
      review.review_text || "No comment",
      review.reply ? "Yes" : "No",
    ]);

    (doc as any).autoTable({
      head: [["Date", "Rating", "Review", "Replied"]],
      body: tableData,
      startY: 45,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`reviews-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: "Success",
      description: "Reviews exported to PDF",
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customer Reviews</h1>
        <Button onClick={exportToPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export to PDF
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <div className="flex items-center mt-1">
              {renderStars(Math.round(stats.averageRating))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Rating Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm w-6">{rating}★</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${
                        stats.totalReviews > 0
                          ? (stats.ratingBreakdown[rating] / stats.totalReviews) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8">
                  {stats.ratingBreakdown[rating]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No reviews found</p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map(review => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {renderStars(review.rating)}
                    <Badge variant="secondary">
                      {new Date(review.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedReview(review);
                      setReportDialog(true);
                    }}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </Button>
                </div>

                <p className="text-foreground mb-4">{review.review_text}</p>

                {review.reply ? (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Reply className="h-4 w-4" />
                      <span className="font-semibold text-sm">Your Reply</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.reply.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{review.reply.reply_text}</p>
                  </div>
                ) : (
                  selectedReview?.id === review.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => handleReply(review.id)}>
                          Post Reply
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedReview(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReview(review)}
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      Reply to Review
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={reportDialog} onOpenChange={setReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
            <DialogDescription>
              Report this review if it violates our community guidelines
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="false">False Information</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={!reportReason}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
