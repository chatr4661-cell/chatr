import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Disclaimer() {
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

        <h1 className="text-3xl font-bold mb-6">Disclaimer</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: January 2025</p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. General Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              The information provided by Chatr (operated by TalentXcel Services Pvt. Ltd.) is for general informational and communication purposes only. All content is provided "as is" without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Health and Wellness Features</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr offers wellness tracking, symptom checking, and health-related features. These are NOT substitutes for professional medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for medical concerns. Never disregard professional medical advice based on information from Chatr.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. AI-Powered Features</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr uses AI for smart replies, chat summaries, and content suggestions. AI-generated content may not always be accurate or appropriate. Users should verify important information independently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr users can share messages, photos, videos, and other content. We do not endorse, verify, or take responsibility for user-generated content. Views expressed by users do not represent our official position.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Services and Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr may integrate with or link to third-party services, websites, or apps. We are not responsible for the content, privacy practices, or availability of external services. Use them at your own discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Financial Transactions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Features like Chatr Coins, payments, and business transactions are facilitated through third-party payment providers. We are not responsible for payment failures, delays, or disputes. Users should verify transaction details before confirming.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we strive for continuous service, Chatr may experience downtime, interruptions, or technical issues. We do not guarantee uninterrupted access and are not liable for service disruptions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Accuracy of Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We make reasonable efforts to ensure information accuracy but do not guarantee completeness or timeliness. Content may contain errors or omissions. Users should independently verify critical information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Professional Advice</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr does not provide professional advice (legal, financial, medical, or otherwise). Information shared through the app should not be considered professional counsel. Consult licensed professionals for specific advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Privacy and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we implement security measures and end-to-end encryption, no system is completely secure. Users are responsible for maintaining the confidentiality of their account credentials and should use strong passwords.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Age Restrictions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr is intended for users aged 13 and above. Minors should use the app under parental guidance. Parents are responsible for monitoring their children's online activities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Content Moderation</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we may moderate reported content, we cannot monitor all user communications. We are not responsible for offensive, illegal, or harmful content shared by users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Geographical Limitations</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr is operated from India and complies with Indian laws. Some features may not be available in all regions. Users are responsible for compliance with local laws in their jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, TalentXcel Services Pvt. Ltd. shall not be liable for any damages arising from use of Chatr, including but not limited to direct, indirect, incidental, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Changes to Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any features or services without prior notice. This disclaimer may be updated periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">16. Emergency Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr is not a replacement for emergency services. In case of medical, police, or fire emergencies, contact local emergency numbers (112 in India) immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">17. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this disclaimer:<br />
              TalentXcel Services Pvt. Ltd.<br />
              Email: legal@chatr.app<br />
              Address: [Your Registered Address]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
