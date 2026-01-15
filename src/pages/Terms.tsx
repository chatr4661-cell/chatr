import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
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

        <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: January 2025</p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Chatr (a product of Talentxcel Services Pvt Ltd), you accept and agree to be bound by the terms and conditions of this agreement. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Services Provided</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr provides instant messaging, voice and video calling, health tracking, and social networking services. We reserve the right to modify, suspend, or discontinue any part of our services at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 13 years old to use Chatr. Users between 13-18 years must have parental consent. By using our services, you represent that you meet these age requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              You agree not to use Chatr to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Violate any laws or regulations of India</li>
              <li>Harass, threaten, or harm others</li>
              <li>Share false, misleading, or defamatory content</li>
              <li>Distribute spam, malware, or unauthorized advertising</li>
              <li>Infringe on intellectual property rights</li>
              <li>Impersonate others or misrepresent your identity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Content Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of content you share on Chatr. By posting content, you grant us a license to use, store, and display that content as necessary to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Privacy and Data Protection</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Our data practices comply with the Information Technology Act, 2000 and applicable Indian privacy laws. Please review our Privacy Policy for details on how we collect and use your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All intellectual property rights in Chatr, including trademarks, logos, and software, belong to Talentxcel Services Pvt Ltd. You may not copy, modify, or distribute our intellectual property without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chatr is provided "as is" without warranties. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to terminate or suspend your account at any time for violation of these terms or for any other reason deemed necessary.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in [Your City], India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, please contact us at:<br />
              Talentxcel Services Pvt Ltd<br />
              Email: legal@chatr.chat<br />
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
