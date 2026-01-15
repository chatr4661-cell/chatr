import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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

        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: January 2025</p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We collect the following types of information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Account Information: Phone number, username, profile photo</li>
              <li>Messages and Content: Messages, photos, videos, voice notes</li>
              <li>Health Data: Wellness tracking, mood logs, health metrics (with consent)</li>
              <li>Device Information: Device type, operating system, IP address</li>
              <li>Usage Data: App interactions, features used, performance data</li>
              <li>Location Data: Approximate location for service improvement (with permission)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Your information is used to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Provide and maintain our services</li>
              <li>Enable communication between users</li>
              <li>Personalize your experience</li>
              <li>Improve app features and performance</li>
              <li>Send important notifications about service updates</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. End-to-End Encryption</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your messages and calls are protected with end-to-end encryption. This means only you and the recipient can read or hear them. Chatr cannot access the content of your encrypted messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data. Your information is stored on secure servers located in India and complies with the Information Technology Act, 2000 and IT Rules 2011.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We do not sell your personal information. We may share data only in these cases:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations or court orders</li>
              <li>To protect our rights, safety, or property</li>
              <li>With service providers who assist in operating our app (under strict confidentiality)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Under Indian law, you have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Access your personal information</li>
              <li>Correct or update your data</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Withdraw consent for data processing</li>
              <li>File a complaint with relevant authorities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data only as long as necessary to provide services or as required by law. You can delete your account at any time, which will remove your personal data from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users under 18 should obtain parental consent before using Chatr. We do not knowingly collect data from children under 13 without parental consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr may integrate with third-party services (e.g., payment gateways, cloud storage). These services have their own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to improve app performance and user experience. You can control cookie settings in your device.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy from time to time. We will notify you of significant changes through the app or via email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Grievance Officer</h2>
            <p className="text-muted-foreground leading-relaxed">
              As required by Indian IT Rules, our Grievance Officer can be contacted at:<br />
              Talentxcel Services Pvt Ltd<br />
              Email: grievance@chatr.chat<br />
              Response Time: Within 48 hours
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions, contact:<br />
              Talentxcel Services Pvt Ltd<br />
              Email: privacy@chatr.chat<br />
              Website: chatr.chat
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-border/40">
              © 2026 Talentxcel Services Pvt Ltd. All rights reserved.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
