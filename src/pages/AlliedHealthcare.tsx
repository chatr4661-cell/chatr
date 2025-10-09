import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Search, ChevronLeft, Home, Heart, Brain, Utensils, FlaskConical, 
  Eye, Pill, Dna, Activity, Sparkles, FileText, 
  Stethoscope, Users, Clock, MapPin, Star, Phone,
  Zap, Baby, Scissors, MessageCircle, Sun, Moon
} from 'lucide-react';

interface HealthcareRole {
  title: string;
  description: string;
  workSettings: string;
  services: string;
}

interface HealthcareCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  roles: HealthcareRole[];
}

const AlliedHealthcare = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const healthcareCategories: HealthcareCategory[] = [
    {
      id: 'home-care',
      name: '🏠 Home & Community Care',
      icon: Home,
      color: 'from-blue-500/20 to-cyan-500/20',
      description: 'Essential at-home healthcare services for personalized, compassionate care',
      roles: [
        { title: 'Home Care Nurse', description: 'Licensed nurse providing clinical care at home', workSettings: 'Home, hospice, community centers', services: 'Wound care, IV therapy, vitals monitoring, post-surgery care' },
        { title: 'Caregiver / Personal Support Worker', description: 'Provides daily living assistance', workSettings: 'Home, senior homes', services: 'Bathing, grooming, mobility, companionship' },
        { title: 'Palliative Care Specialist', description: 'Supports end-of-life comfort and pain relief', workSettings: 'Home, hospice', services: 'Symptom management, emotional support, pain control' },
        { title: 'Rehabilitation Aide', description: 'Supports physiotherapists in rehab exercises', workSettings: 'Home, rehab centers', services: 'Guided exercises, mobility training' },
        { title: 'Community Health Worker', description: 'Bridges healthcare and community outreach', workSettings: 'Rural clinics, NGOs, homes', services: 'Health education, chronic care monitoring' },
        { title: 'Respiratory Therapist', description: 'Manages breathing therapies', workSettings: 'Home, pulmonary rehab', services: 'Oxygen therapy, CPAP setup, asthma management' },
        { title: 'Geriatric Care Coordinator', description: 'Manages elderly patients care plans', workSettings: 'Home, assisted living', services: 'Routine check-ins, medication tracking, family liaison' },
      ]
    },
    {
      id: 'rehabilitation',
      name: '💪 Rehabilitation & Physical Health',
      icon: Activity,
      color: 'from-green-500/20 to-emerald-500/20',
      description: 'Restore mobility, function, and quality of life through expert therapy',
      roles: [
        { title: 'Physiotherapist', description: 'Restores mobility and function', workSettings: 'Hospitals, clinics, home', services: 'Post-surgery rehab, sports injury recovery' },
        { title: 'Occupational Therapist', description: 'Helps people regain daily life skills', workSettings: 'Rehab centers, homes', services: 'Hand therapy, adaptive device training' },
        { title: 'Chiropractor', description: 'Treats musculoskeletal disorders', workSettings: 'Clinics', services: 'Spine alignment, back pain management' },
        { title: 'Speech & Language Pathologist', description: 'Treats communication/swallowing issues', workSettings: 'Clinics, schools, hospitals', services: 'Speech therapy, stammering, aphasia recovery' },
        { title: 'Rehabilitation Counselor', description: 'Supports reintegration post-injury', workSettings: 'Hospitals, employment centers', services: 'Vocational rehab, counseling' },
        { title: 'Orthotist / Prosthetist', description: 'Designs and fits support devices', workSettings: 'Specialized clinics', services: 'Braces, artificial limbs' },
        { title: 'Exercise Physiologist', description: 'Focuses on exercise-based recovery', workSettings: 'Wellness centers, hospitals', services: 'Customized exercise programs' },
        { title: 'Massage Therapist', description: 'Relieves pain and muscle tension', workSettings: 'Clinics, spas, home', services: 'Massage therapy, sports injury prevention' },
      ]
    },
    {
      id: 'mental-health',
      name: '🧠 Mental & Behavioral Health',
      icon: Brain,
      color: 'from-purple-500/20 to-pink-500/20',
      description: 'Comprehensive mental health support for emotional well-being',
      roles: [
        { title: 'Clinical Psychologist', description: 'Diagnoses and treats mental health disorders', workSettings: 'Clinics, telehealth', services: 'CBT, anxiety/depression therapy' },
        { title: 'Psychiatric Nurse', description: 'Provides psychiatric care under supervision', workSettings: 'Hospitals, homes', services: 'Medication administration, counseling' },
        { title: 'Counselor / Therapist', description: 'Offers talk therapy', workSettings: 'Clinics, online', services: 'Grief counseling, relationship therapy' },
        { title: 'Behavioral Therapist', description: 'Treats behavioral issues (autism, ADHD)', workSettings: 'Schools, clinics', services: 'Behavior modification therapy (ABA, CBT, DBT)' },
        { title: 'Social Worker / Case Manager', description: 'Coordinates social and community support', workSettings: 'NGOs, hospitals', services: 'Family intervention, financial counseling' },
        { title: 'Neuropsychologist', description: 'Studies brain-behavior relationship', workSettings: 'Hospitals', services: 'Cognitive assessment after stroke/TBI' },
      ]
    },
    {
      id: 'nutrition',
      name: '🥗 Nutrition & Lifestyle',
      icon: Utensils,
      color: 'from-orange-500/20 to-yellow-500/20',
      description: 'Transform your health through personalized nutrition and wellness',
      roles: [
        { title: 'Clinical Dietitian', description: 'Licensed nutrition expert', workSettings: 'Hospitals, clinics, telehealth', services: 'Clinical diet plans, diabetic meal plans' },
        { title: 'Nutritionist', description: 'Guides general wellness diets', workSettings: 'Wellness centers, online', services: 'Weight management, detox, holistic diets' },
        { title: 'Health Coach', description: 'Promotes healthy lifestyle habits', workSettings: 'Online, corporate wellness', services: 'Habit tracking, coaching programs' },
        { title: 'Diabetes Educator', description: 'Trains patients in diabetes self-care', workSettings: 'Hospitals, clinics', services: 'Glucose monitoring, insulin management' },
        { title: 'Fitness Trainer', description: 'Designs personalized workouts', workSettings: 'Gyms, home, virtual', services: 'Strength training, cardio, yoga' },
        { title: 'Ayurvedic Consultant', description: 'Focuses on holistic, natural care', workSettings: 'Ayurvedic centers, online', services: 'Herbal remedies, detox, yoga therapy' },
      ]
    },
    {
      id: 'diagnostics',
      name: '🔬 Diagnostics & Technical',
      icon: FlaskConical,
      color: 'from-red-500/20 to-rose-500/20',
      description: 'Advanced diagnostic technology for accurate health insights',
      roles: [
        { title: 'Medical Lab Technician', description: 'Conducts lab tests and analysis', workSettings: 'Hospitals, labs', services: 'Blood, urine, and culture tests' },
        { title: 'Radiographer', description: 'Operates imaging equipment', workSettings: 'Hospitals, diagnostic centers', services: 'X-ray, CT, MRI scans' },
        { title: 'Phlebotomist', description: 'Specializes in blood collection', workSettings: 'Labs, home visits', services: 'Blood sample collection' },
        { title: 'ECG/EEG Technician', description: 'Performs physiological recordings', workSettings: 'Hospitals', services: 'Heart, brain, muscle activity tests' },
        { title: 'Sleep Technician', description: 'Studies sleep patterns', workSettings: 'Sleep labs', services: 'Sleep apnea testing' },
        { title: 'Pathology Assistant', description: 'Supports pathologists in diagnostics', workSettings: 'Labs', services: 'Tissue sample prep and analysis' },
      ]
    },
    {
      id: 'sensory',
      name: '👂 Sensory & Communication',
      icon: Eye,
      color: 'from-indigo-500/20 to-violet-500/20',
      description: 'Expert care for hearing, vision, and communication needs',
      roles: [
        { title: 'Audiologist', description: 'Diagnoses and treats hearing issues', workSettings: 'Clinics, ENT centers', services: 'Hearing tests, hearing aid fitting' },
        { title: 'Optometrist', description: 'Manages vision and eye health', workSettings: 'Eye hospitals, clinics', services: 'Eye exams, vision therapy' },
        { title: 'Speech Pathologist', description: 'Assists with speech, language, swallowing', workSettings: 'Clinics, schools', services: 'Communication therapy' },
        { title: 'Hearing Aid Specialist', description: 'Fits and maintains hearing devices', workSettings: 'Clinics', services: 'Custom hearing solutions' },
        { title: 'Low Vision Specialist', description: 'Supports patients with partial sight', workSettings: 'Eye hospitals', services: 'Vision aids, orientation training' },
      ]
    },
    {
      id: 'pharmacy',
      name: '💊 Pharmacy & Clinical Support',
      icon: Pill,
      color: 'from-teal-500/20 to-cyan-500/20',
      description: 'Safe medication management and therapeutic support',
      roles: [
        { title: 'Clinical Pharmacist', description: 'Dispenses and advises on medication', workSettings: 'Pharmacies, hospitals', services: 'Medication review, drug interaction checks' },
        { title: 'Pharmacy Technician', description: 'Supports pharmacists in operations', workSettings: 'Hospitals, pharmacies', services: 'Prescription preparation' },
        { title: 'Clinical Research Coordinator', description: 'Manages clinical trials', workSettings: 'Hospitals, research institutes', services: 'Patient enrollment, data management' },
        { title: 'Medical Technologist', description: 'Runs specialized lab or clinical tests', workSettings: 'Hospitals, labs', services: 'Biochemical and molecular diagnostics' },
        { title: 'Sterile Processing Technician', description: 'Ensures equipment sterility', workSettings: 'Hospitals, surgery centers', services: 'Instrument cleaning and sterilization' },
      ]
    },
    {
      id: 'specialized',
      name: '🧬 Specialized & Emerging',
      icon: Dna,
      color: 'from-fuchsia-500/20 to-pink-500/20',
      description: 'Cutting-edge healthcare innovations and genetic counseling',
      roles: [
        { title: 'Genetic Counselor', description: 'Provides genetic testing advice', workSettings: 'Hospitals, telehealth', services: 'Risk assessment for hereditary diseases' },
        { title: 'Telehealth Coordinator', description: 'Manages remote care operations', workSettings: 'Healthtech companies', services: 'Teleconsult scheduling, patient onboarding' },
        { title: 'Health Informatics Specialist', description: 'Manages digital health data systems', workSettings: 'Hospitals, startups', services: 'EMR systems, analytics' },
        { title: 'Public Health Educator', description: 'Promotes population health', workSettings: 'NGOs, government', services: 'Health awareness campaigns' },
        { title: 'Medical Device Technician', description: 'Maintains and calibrates medical equipment', workSettings: 'Hospitals, clinics', services: 'Device setup, calibration' },
        { title: 'Clinical Data Analyst', description: 'Analyzes medical and patient data', workSettings: 'Hospitals, startups', services: 'Outcome tracking, AI insights' },
      ]
    },
    {
      id: 'integrative',
      name: '🧩 Integrative & Alternative',
      icon: Sparkles,
      color: 'from-amber-500/20 to-orange-500/20',
      description: 'Holistic healing through ancient wisdom and modern science',
      roles: [
        { title: 'Acupuncturist', description: 'Uses needle therapy to restore balance', workSettings: 'Alternative clinics', services: 'Pain relief, stress reduction' },
        { title: 'Homeopath / Naturopath', description: 'Uses natural remedies and holistic care', workSettings: 'Clinics, home', services: 'Herbal treatments, lifestyle medicine' },
        { title: 'Yoga Therapist', description: 'Combines yoga and therapy for healing', workSettings: 'Studios, hospitals', services: 'Recovery, stress management' },
        { title: 'Reflexologist', description: 'Energy and pressure-point therapy', workSettings: 'Wellness centers', services: 'Relaxation, energy balance' },
      ]
    },
    {
      id: 'administrative',
      name: '🧾 Administrative & Support',
      icon: FileText,
      color: 'from-slate-500/20 to-gray-500/20',
      description: 'Essential support services for seamless healthcare operations',
      roles: [
        { title: 'Medical Transcriptionist', description: 'Converts physician dictations into reports', workSettings: 'Hospitals, remote', services: 'Clinical documentation' },
        { title: 'Health Records Technician', description: 'Manages patient records', workSettings: 'Hospitals', services: 'EMR updates, data entry' },
        { title: 'Healthcare Administrator', description: 'Coordinates clinical operations', workSettings: 'Clinics, health startups', services: 'Scheduling, compliance' },
        { title: 'Patient Care Coordinator', description: 'Liaises between patients and providers', workSettings: 'Hospitals, telehealth', services: 'Case tracking, patient education' },
        { title: 'Medical Biller / Coder', description: 'Handles insurance and billing codes', workSettings: 'Hospitals, remote', services: 'Claim submission, coding accuracy' },
      ]
    },
  ];

  const filteredCategories = healthcareCategories.filter(category => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      category.name.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query) ||
      category.roles.some(role => 
        role.title.toLowerCase().includes(query) ||
        role.description.toLowerCase().includes(query) ||
        role.services.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border/50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Allied Healthcare Directory
                </h1>
                <p className="text-sm text-muted-foreground">World's First Comprehensive Healthcare Professional Directory</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search professionals, categories, or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl glass-card border-border/50"
            />
          </div>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary mb-1">10</div>
              <p className="text-sm text-muted-foreground">Major Categories</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-accent mb-1">80+</div>
              <p className="text-sm text-muted-foreground">Healthcare Professions</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">24/7</div>
              <p className="text-sm text-muted-foreground">Support Available</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">∞</div>
              <p className="text-sm text-muted-foreground">Better Health Outcomes</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {healthcareCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(selectedCategory === category.id ? null : category.id);
                  document.getElementById(category.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`p-4 rounded-xl glass-card border-border/50 hover:shadow-lg transition-all ${
                  selectedCategory === category.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <IconComponent className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium text-center line-clamp-2">{category.name}</p>
              </button>
            );
          })}
        </div>

        {/* Healthcare Categories */}
        <Accordion type="single" collapsible className="space-y-4">
          {filteredCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <AccordionItem
                key={category.id}
                value={category.id}
                id={category.id}
                className="glass-card border-border/50 rounded-xl overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline group">
                  <div className="flex items-center gap-4 w-full">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color} group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-lg font-bold">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                      <Badge variant="secondary" className="mt-2">
                        {category.roles.length} Professions
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {category.roles.map((role, index) => (
                      <Card key={index} className="border-border/30 hover:shadow-md transition-shadow cursor-pointer group">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-start justify-between gap-2">
                            <span className="group-hover:text-primary transition-colors">{role.title}</span>
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                              Featured
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">{role.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{role.workSettings}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Stethoscope className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{role.services}</span>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => navigate('/booking')}>
                              <Phone className="h-3 w-3 mr-1" />
                              Book Now
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => navigate('/chat')}>
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Chat
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Call to Action */}
        <Card className="glass-card border-border/50 mt-8 bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="py-8 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">Join the Healthcare Revolution</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Connect with world-class allied healthcare professionals. From home care to specialized therapies, 
              find the perfect healthcare partner for your wellness journey.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button size="lg" onClick={() => navigate('/booking')}>
                <Users className="h-5 w-5 mr-2" />
                Find a Professional
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/provider-register')}>
                <Stethoscope className="h-5 w-5 mr-2" />
                Join as Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-lg z-50">
        <div className="flex items-center justify-around py-3 max-w-md mx-auto">
          <button 
            onClick={() => navigate('/')}
            className="flex flex-col items-center gap-1 px-4"
          >
            <Home className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-primary">Home</span>
          </button>
          <button 
            onClick={() => navigate('/booking')}
            className="flex flex-col items-center gap-1 px-4"
          >
            <Phone className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Book</span>
          </button>
          <button 
            onClick={() => navigate('/health-passport')}
            className="flex flex-col items-center gap-1 px-4"
          >
            <Heart className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Passport</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AlliedHealthcare;
