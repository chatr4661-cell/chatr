import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Star, Zap, Crown, ArrowRight } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_yearly: number;
  max_services: number;
  max_bookings_per_month: number;
  features: any;
  display_order: number;
}

interface CurrentSubscription {
  id: string;
  plan_id: string;
  billing_cycle: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_ends_at?: string;
  plan?: SubscriptionPlan;
}

export default function SellerSubscription() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearlyBilling, setYearlyBilling] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  useEffect(() => {
    if (providerId) {
      fetchData();
    }
  }, [providerId]);

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

  const fetchData = async () => {
    if (!providerId) return;

    setLoading(true);
    try {
      // Fetch all plans
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (plansError) throw plansError;

      setPlans((plansData as any) || []);

      // Fetch current subscription
      const { data: subData, error: subError } = await supabase
        .from("seller_subscriptions" as any)
        .select("*")
        .eq("seller_id", providerId)
        .eq("status", "active")
        .maybeSingle();

      if (subError && subError.code !== "PGRST116") {
        throw subError;
      }

      if (subData) {
        const planData = plansData?.find(p => p.id === (subData as any).plan_id);
        setCurrentSubscription({
          ...(subData as any),
          plan: planData as any,
        });
        setYearlyBilling((subData as any).billing_cycle === "yearly");
      }
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

  const handleUpgrade = async () => {
    if (!selectedPlan || !providerId) return;

    try {
      const billingCycle = yearlyBilling ? "yearly" : "monthly";
      const currentDate = new Date();
      const periodEnd = new Date(currentDate);
      
      if (billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      if (currentSubscription) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from("seller_subscriptions" as any)
          .update({
            plan_id: selectedPlan.id,
            billing_cycle: billingCycle,
            current_period_start: currentDate.toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq("id", currentSubscription.id);

        if (updateError) throw updateError;

        // Record history
        await supabase
          .from("seller_subscription_history" as any)
          .insert({
            subscription_id: currentSubscription.id,
            from_plan_id: currentSubscription.plan_id,
            to_plan_id: selectedPlan.id,
            change_type: getChangeType(currentSubscription.plan?.display_order || 0, selectedPlan.display_order),
            effective_date: currentDate.toISOString(),
          });
      } else {
        // Create new subscription with 14-day trial
        const trialEnd = new Date(currentDate);
        trialEnd.setDate(trialEnd.getDate() + 14);

        const { error: insertError } = await supabase
          .from("seller_subscriptions" as any)
          .insert({
            seller_id: providerId,
            plan_id: selectedPlan.id,
            billing_cycle: billingCycle,
            current_period_start: currentDate.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_ends_at: trialEnd.toISOString(),
            status: "active",
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: currentSubscription
          ? "Your subscription has been updated"
          : "Welcome! Your 14-day free trial has started",
      });

      setUpgradeDialog(false);
      setSelectedPlan(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    try {
      const { error } = await supabase
        .from("seller_subscriptions" as any)
        .update({
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", currentSubscription.id);

      if (error) throw error;

      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the end of the current billing period",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getChangeType = (fromOrder: number, toOrder: number): string => {
    if (fromOrder < toOrder) return "upgrade";
    if (fromOrder > toOrder) return "downgrade";
    return "renewal";
  };

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case "basic":
        return <Star className="h-6 w-6" />;
      case "premium":
        return <Zap className="h-6 w-6" />;
      case "enterprise":
        return <Crown className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case "basic":
        return "bg-blue-500/10 text-blue-600";
      case "premium":
        return "bg-purple-500/10 text-purple-600";
      case "enterprise":
        return "bg-amber-500/10 text-amber-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-3">Choose Your Plan</h1>
        <p className="text-muted-foreground text-lg mb-6">
          Select the perfect plan to grow your business
        </p>
        
        <div className="flex items-center justify-center gap-3">
          <span className={!yearlyBilling ? "font-semibold" : "text-muted-foreground"}>
            Monthly
          </span>
          <Switch
            checked={yearlyBilling}
            onCheckedChange={setYearlyBilling}
          />
          <span className={yearlyBilling ? "font-semibold" : "text-muted-foreground"}>
            Yearly
          </span>
          {yearlyBilling && (
            <Badge variant="secondary" className="ml-2">
              Save up to 17%
            </Badge>
          )}
        </div>
      </div>

      {currentSubscription && (
        <Card className="mb-8 border-primary">
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>
              {currentSubscription.plan?.name} Plan - {currentSubscription.billing_cycle}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {currentSubscription.trial_ends_at
                    ? `Trial ends ${new Date(currentSubscription.trial_ends_at).toLocaleDateString()}`
                    : `Renews on ${new Date(currentSubscription.current_period_end).toLocaleDateString()}`}
                </p>
                {currentSubscription.cancel_at_period_end && (
                  <Badge variant="destructive" className="mt-2">
                    Cancels at period end
                  </Badge>
                )}
              </div>
              {!currentSubscription.cancel_at_period_end && (
                <Button variant="outline" onClick={handleCancelSubscription}>
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map(plan => {
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          const price = yearlyBilling ? plan.price_yearly : plan.price_monthly;
          const monthlyEquivalent = yearlyBilling ? (plan.price_yearly / 12).toFixed(2) : null;

          return (
            <Card
              key={plan.id}
              className={`relative ${
                isCurrentPlan ? "border-primary shadow-lg" : ""
              } ${plan.tier === "premium" ? "border-2 border-primary" : ""}`}
            >
              {plan.tier === "premium" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader>
                <div className={`inline-flex p-3 rounded-lg ${getPlanColor(plan.tier)} w-fit mb-3`}>
                  {getPlanIcon(plan.tier)}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">
                      ${price.toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">
                      /{yearlyBilling ? "year" : "month"}
                    </span>
                    {monthlyEquivalent && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${monthlyEquivalent}/month billed yearly
                      </p>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>
                      {plan.max_services === -1
                        ? "Unlimited services"
                        : `Up to ${plan.max_services} services`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>
                      {plan.max_bookings_per_month === -1
                        ? "Unlimited bookings"
                        : `${plan.max_bookings_per_month} bookings/month`}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  {(Array.isArray(plan.features) ? plan.features : []).map((feature: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full mt-6"
                  variant={isCurrentPlan ? "outline" : "default"}
                  disabled={isCurrentPlan}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setUpgradeDialog(true);
                  }}
                >
                  {isCurrentPlan ? (
                    "Current Plan"
                  ) : (
                    <>
                      {currentSubscription ? "Upgrade" : "Get Started"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compare Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  {plans.map(plan => (
                    <th key={plan.id} className="text-center py-3 px-4 font-medium">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">Max Services</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-3 px-4">
                      {plan.max_services === -1 ? "Unlimited" : plan.max_services}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Monthly Bookings</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-3 px-4">
                      {plan.max_bookings_per_month === -1 ? "Unlimited" : plan.max_bookings_per_month}
                    </td>
                  ))}
                </tr>
                {Array.from(
                  new Set(plans.flatMap(p => Array.isArray(p.features) ? p.features : []))
                ).map(feature => (
                  <tr key={feature} className="border-b">
                    <td className="py-3 px-4">{feature}</td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {(Array.isArray(plan.features) ? plan.features : []).includes(feature) ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentSubscription ? "Change Plan" : "Start Free Trial"}
            </DialogTitle>
            <DialogDescription>
              {currentSubscription
                ? `Switch to ${selectedPlan?.name} plan`
                : "Start your 14-day free trial - no credit card required"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{selectedPlan.name} Plan</span>
                  <span className="font-bold">
                    ${(yearlyBilling ? selectedPlan.price_yearly : selectedPlan.price_monthly).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Billed {yearlyBilling ? "annually" : "monthly"}
                </p>
                {!currentSubscription && (
                  <p className="text-sm text-green-600 mt-2">
                    14-day free trial included
                  </p>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {currentSubscription
                  ? "Changes will take effect immediately"
                  : "You can cancel anytime during the trial period"}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade}>
              {currentSubscription ? "Confirm Change" : "Start Free Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
