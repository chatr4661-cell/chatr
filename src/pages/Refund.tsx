import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Refund() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-6">Refund and Cancellation Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: January 2025</p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Free Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Most of Chatr's core features (messaging, calling, health tracking) are free. No refunds are applicable for free services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Premium Services and In-App Purchases</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr may offer premium features, subscriptions, or in-app purchases (e.g., Chatr Coins, premium themes, business features). These are governed by the following refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Eligibility for Refunds</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Refunds may be issued in the following cases:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Duplicate charges or unauthorized transactions</li>
              <li>Technical errors preventing access to purchased features</li>
              <li>Service not delivered as described</li>
              <li>Accidental purchases reported within 48 hours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Non-Refundable Items</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              The following are non-refundable:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Chatr Coins spent on virtual gifts or services</li>
              <li>Subscriptions after 48 hours of purchase</li>
              <li>Services already consumed or used</li>
              <li>Promotional or discounted purchases</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Subscription Cancellation</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can cancel your subscription at any time from your account settings. Cancellation will take effect at the end of the current billing period. No partial refunds are provided for unused time in the current period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              To request a refund:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1 ml-4">
              <li>Contact our support team at refunds@chatr.app</li>
              <li>Provide transaction details (date, amount, order ID)</li>
              <li>Explain the reason for your refund request</li>
              <li>Include any supporting evidence (screenshots, receipts)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Refund Processing Time</h2>
            <p className="text-muted-foreground leading-relaxed">
              Approved refunds will be processed within 7-10 business days. The refund will be credited to your original payment method. Bank processing times may vary.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Payment Gateway Policies</h2>
            <p className="text-muted-foreground leading-relaxed">
              For purchases made through Google Play Store or Apple App Store, refund requests must be submitted through the respective platform. Please refer to their refund policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Chargebacks and Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              Initiating a chargeback without contacting us may result in account suspension. Please contact our support team first to resolve any billing disputes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Service Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or discontinue services. If a paid service is discontinued, we will provide notice and may offer refunds or alternative services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Compliance with Indian Laws</h2>
            <p className="text-muted-foreground leading-relaxed">
              This policy complies with the Consumer Protection Act, 2019 and RBI guidelines for digital payments in India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For refund-related queries:<br />
              TalentXcel Services Pvt. Ltd.<br />
              Email: refunds@chatr.app<br />
              Support: support@chatr.app<br />
              Address: [Your Registered Address]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
