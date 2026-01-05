import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ServiceReview() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to submit review');
        return;
      }

      // Get booking to find provider
      const { data: booking, error: bookingError } = await supabase
        .from('service_bookings')
        .select('provider_id')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Submit review
      const { error: reviewError } = await supabase
        .from('service_reviews')
        .insert({
          booking_id: bookingId,
          provider_id: booking.provider_id,
          customer_id: user.id,
          rating: rating,
          review_text: review,
          is_anonymous: false
        });

      if (reviewError) throw reviewError;

      toast.success('Review submitted successfully!');
      navigate('/services/history');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground mb-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Rate Your Experience</h1>
        <p className="text-sm opacity-80">Help others by sharing your feedback</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Rating */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-center">How was the service?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    className={cn(
                      "h-10 w-10 transition-colors",
                      (hoverRating || rating) >= star 
                        ? "fill-yellow-400 text-yellow-400" 
                        : "text-muted-foreground"
                    )} 
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {rating === 0 && "Tap to rate"}
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent!"}
            </p>
          </CardContent>
        </Card>

        {/* Review Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Write a Review (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Share details about your experience..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Quick Tags */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Quick Feedback</p>
            <div className="flex flex-wrap gap-2">
              {['Professional', 'On Time', 'Clean Work', 'Good Value', 'Friendly'].map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  onClick={() => setReview(prev => 
                    prev ? `${prev}, ${tag}` : tag
                  )}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </div>
  );
}
