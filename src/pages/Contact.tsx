import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Store contact form submission in database
      const { error } = await supabase
        .from('contact_submissions')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message
          }
        ]);

      if (error) throw error;

      toast.success('Message sent successfully!', {
        description: 'We\'ll get back to you within 24 hours.'
      });

      // Reset form
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      value: 'support@chatr.chat',
      link: 'mailto:support@chatr.chat'
    },
    {
      icon: Phone,
      title: 'Phone',
      value: '+91 120 XXX XXXX',
      link: 'tel:+911201234567'
    },
    {
      icon: MapPin,
      title: 'Address',
      value: 'Noida, Uttar Pradesh, India',
      link: 'https://maps.google.com'
    },
    {
      icon: Clock,
      title: 'Support Hours',
      value: '24/7 Available',
      link: null
    }
  ];

  const socialLinks = [
    { name: 'Twitter', url: 'https://twitter.com/ChatrAppOfficial', icon: '𝕏' },
    { name: 'Instagram', url: 'https://instagram.com/chatrplus', icon: '📷' },
    { name: 'LinkedIn', url: 'https://linkedin.com/company/talentxcel', icon: '💼' },
    { name: 'Facebook', url: 'https://facebook.com/chatrplus', icon: '👍' }
  ];

  return (
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
          <h1 className="text-xl font-bold">Contact Us</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Get in Touch</h2>
          <p className="text-muted-foreground">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </Card>

        {/* Contact Info Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {contactInfo.map((info, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <info.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{info.title}</h3>
                  {info.link ? (
                    <a href={info.link} className="text-sm text-muted-foreground hover:text-primary">
                      {info.value}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">{info.value}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Contact Form */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Send us a Message</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name</label>
                <Input
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject</label>
              <Input
                placeholder="What is this regarding?"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message</label>
              <Textarea
                placeholder="Tell us more..."
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </Card>

        {/* Social Links */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Follow Us</h3>
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((social, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => window.open(social.url, '_blank')}
              >
                <span className="mr-2">{social.icon}</span>
                {social.name}
              </Button>
            ))}
          </div>
        </Card>

        {/* Additional Support */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-cyan-500/5">
          <h3 className="font-semibold mb-2">Need Immediate Help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Check out our Help Center for instant answers to common questions
          </p>
          <Button variant="outline" onClick={() => navigate('/help')}>
            Visit Help Center
          </Button>
        </Card>
      </div>
    </div>
  );
}
