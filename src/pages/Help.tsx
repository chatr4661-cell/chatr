import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageCircle, Heart, Users, Shield, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SEOHead } from '@/components/SEOHead';

export default function Help() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { icon: MessageCircle, title: 'Chat & Messaging', color: 'text-green-500' },
    { icon: Heart, title: 'Health & Wellness', color: 'text-red-500' },
    { icon: Users, title: 'Communities', color: 'text-purple-500' },
    { icon: Shield, title: 'Privacy & Security', color: 'text-blue-500' },
    { icon: Zap, title: 'Features & Tools', color: 'text-yellow-500' }
  ];

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Click on "Get Started" or "Sign Up", enter your phone number or email, verify with OTP, and complete your profile setup.'
        },
        {
          q: 'Is Chatr+ free to use?',
          a: 'Yes! Chatr+ is completely free. You can earn Chatr Points through activities and use them in the Reward Shop.'
        },
        {
          q: 'What devices can I use Chatr+ on?',
          a: 'Chatr+ works on Android, iOS, and web browsers. You can also install it as a PWA on your device.'
        }
      ]
    },
    {
      category: 'Chat & Messaging',
      questions: [
        {
          q: 'How do I start a conversation?',
          a: 'Go to the Chat tab, tap the "+" button, select a contact or search for users, and start messaging!'
        },
        {
          q: 'Can I make voice and video calls?',
          a: 'Yes! Tap the phone or video icon in any chat to start a call. We support both 1-on-1 and group calls.'
        },
        {
          q: 'How do I send photos and files?',
          a: 'In any chat, tap the attachment icon (📎) to send photos, videos, documents, or contacts.'
        }
      ]
    },
    {
      category: 'Health & Wellness',
      questions: [
        {
          q: 'What is the Health Hub?',
          a: 'Health Hub is your personal health dashboard with AI assistance, vitals tracking, lab reports, and wellness insights.'
        },
        {
          q: 'How do I book a doctor appointment?',
          a: 'Go to Care Access → Browse doctors by specialty → Select time slot → Confirm booking. You\'ll get instant confirmation.'
        },
        {
          q: 'Is my health data secure?',
          a: 'Absolutely. All health data is encrypted end-to-end and stored securely. You have full control over who sees your information.'
        }
      ]
    },
    {
      category: 'Chatr Points & Rewards',
      questions: [
        {
          q: 'How do I earn Chatr Points?',
          a: 'Earn points through: Daily logins (streak bonus!), Referring friends, Completing challenges, Using features, Community participation.'
        },
        {
          q: 'What can I do with Chatr Points?',
          a: 'Redeem points in the Reward Shop for: Premium features, Gift vouchers, Health checkups, Local deals & discounts.'
        },
        {
          q: 'Do points expire?',
          a: 'Points don\'t expire as long as your account remains active. Keep your streak going to earn more!'
        }
      ]
    },
    {
      category: 'Privacy & Security',
      questions: [
        {
          q: 'Is my data encrypted?',
          a: 'Yes! All messages, calls, and personal data are encrypted end-to-end. We use bank-level security protocols.'
        },
        {
          q: 'Can I control who sees my information?',
          a: 'Absolutely. Go to Settings → Privacy to control profile visibility, last seen, read receipts, and more.'
        },
        {
          q: 'How do I report inappropriate content?',
          a: 'Long-press any message or post, select "Report", choose a reason, and submit. Our team reviews reports within 24 hours.'
        }
      ]
    },
    {
      category: 'Business Tools',
      questions: [
        {
          q: 'How do I set up a Business account?',
          a: 'Go to Business Hub → Start Setup → Provide business details → Verify documents → Start using CRM, analytics, and inbox tools.'
        },
        {
          q: 'Can I use Chatr+ for my clinic/practice?',
          a: 'Yes! Register as a healthcare provider through Doctor Portal. You\'ll get appointment management, patient records, and teleconsultation tools.'
        }
      ]
    }
  ];

  const quickLinks = [
    { title: 'Account Settings', path: '/account' },
    { title: 'Privacy Policy', path: '/privacy' },
    { title: 'Terms of Service', path: '/terms' },
    { title: 'Contact Support', path: '/contact' }
  ];

  return (
    <>
      <SEOHead
        title="Help Center | Chatr+ Support & FAQs"
        description="Get help with Chatr+. Find answers to frequently asked questions about chat, health features, payments, privacy, and more. 24/7 support available."
      />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Help Center</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Search */}
        <Card className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {categories.map((cat, index) => (
            <Card key={index} className="p-4 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <cat.icon className={`h-8 w-8 mx-auto mb-2 ${cat.color}`} />
              <p className="text-xs font-medium">{cat.title}</p>
            </Card>
          ))}
        </div>

        {/* FAQs */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          {faqs.map((section, sectionIndex) => (
            <Card key={sectionIndex} className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-primary">{section.category}</h3>
              <Accordion type="single" collapsible className="space-y-2">
                {section.questions.map((faq, faqIndex) => (
                  <AccordionItem key={faqIndex} value={`${sectionIndex}-${faqIndex}`} className="border-b">
                    <AccordionTrigger className="text-left hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {quickLinks.map((link, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => navigate(link.path)}
                className="justify-start"
              >
                {link.title}
              </Button>
            ))}
          </div>
        </Card>

        {/* Contact Support CTA */}
        <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-cyan-500/5">
          <h3 className="text-xl font-bold mb-2">Still need help?</h3>
          <p className="text-muted-foreground mb-4">
            Our support team is here to assist you 24/7
          </p>
          <Button onClick={() => navigate('/contact')}>
            Contact Support
          </Button>
        </Card>
      </div>
    </div>
    </>
  );
}
