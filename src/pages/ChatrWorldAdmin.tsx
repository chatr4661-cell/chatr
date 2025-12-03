import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, Plus, Briefcase, Heart, Tag, UtensilsCrossed, 
  Trash2, Edit, Loader2, BarChart3, Users, TrendingUp, 
  DollarSign, Eye, Calendar, Settings, Upload, Image
} from 'lucide-react';

export default function ChatrWorldAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalHealthcare: 0,
    totalDeals: 0,
    totalRestaurants: 0,
    totalApplications: 0,
    totalAppointments: 0
  });

  // Form states
  const [jobForm, setJobForm] = useState({
    title: '',
    company_name: '',
    description: '',
    location: '',
    salary_min: '',
    salary_max: '',
    salary_type: 'year',
    job_type: 'full-time',
    skills: '',
    experience_years: '0',
    category: 'IT & Software',
    image_url: ''
  });

  const [healthcareForm, setHealthcareForm] = useState({
    name: '',
    provider_type: 'doctor',
    specialty: 'General Physician',
    description: '',
    address: '',
    city: '',
    phone: '',
    image_url: '',
    consultation_fee: '',
    opening_time: '09:00',
    closing_time: '18:00'
  });

  const [dealForm, setDealForm] = useState({
    title: '',
    description: '',
    category: 'shopping',
    original_price: '',
    deal_price: '',
    discount_percent: '',
    coupon_code: '',
    image_url: '',
    location: '',
    terms_conditions: '',
    expires_at: '',
    max_redemptions: ''
  });

  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    address: '',
    city: '',
    phone: '',
    image_url: '',
    price_range: 'medium',
    delivery_time: '30',
    minimum_order: ''
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [jobs, healthcare, deals, restaurants, applications, appointments] = await Promise.all([
        supabase.from('chatr_jobs').select('id', { count: 'exact', head: true }),
        supabase.from('chatr_healthcare').select('id', { count: 'exact', head: true }),
        supabase.from('chatr_deals').select('id', { count: 'exact', head: true }),
        supabase.from('chatr_restaurants').select('id', { count: 'exact', head: true }),
        supabase.from('chatr_job_applications').select('id', { count: 'exact', head: true }),
        supabase.from('chatr_healthcare_appointments').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        totalJobs: jobs.count || 0,
        totalHealthcare: healthcare.count || 0,
        totalDeals: deals.count || 0,
        totalRestaurants: restaurants.count || 0,
        totalApplications: applications.count || 0,
        totalAppointments: appointments.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddJob = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('chatr_jobs').insert({
        ...jobForm,
        salary_min: jobForm.salary_min ? parseInt(jobForm.salary_min) : null,
        salary_max: jobForm.salary_max ? parseInt(jobForm.salary_max) : null,
        experience_years: parseInt(jobForm.experience_years),
        skills: jobForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        is_active: true
      });

      if (error) throw error;
      toast.success('Job added successfully!');
      setJobForm({
        title: '', company_name: '', description: '', location: '',
        salary_min: '', salary_max: '', salary_type: 'year', job_type: 'full-time',
        skills: '', experience_years: '0', category: 'IT & Software', image_url: ''
      });
      fetchStats();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHealthcare = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('chatr_healthcare').insert({
        ...healthcareForm,
        consultation_fee: healthcareForm.consultation_fee ? parseInt(healthcareForm.consultation_fee) : null,
        is_active: true,
        is_verified: true,
        rating_average: 4.5,
        rating_count: 0
      });

      if (error) throw error;
      toast.success('Healthcare provider added!');
      setHealthcareForm({
        name: '', provider_type: 'doctor', specialty: 'General Physician',
        description: '', address: '', city: '', phone: '', image_url: '',
        consultation_fee: '', opening_time: '09:00', closing_time: '18:00'
      });
      fetchStats();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeal = async () => {
    setLoading(true);
    try {
      const originalPrice = parseInt(dealForm.original_price) || 0;
      const dealPrice = parseInt(dealForm.deal_price) || 0;
      const discountPercent = dealForm.discount_percent 
        ? parseInt(dealForm.discount_percent) 
        : Math.round(((originalPrice - dealPrice) / originalPrice) * 100);

      const { error } = await supabase.from('chatr_deals').insert({
        ...dealForm,
        original_price: originalPrice,
        deal_price: dealPrice,
        discount_percent: discountPercent,
        max_redemptions: dealForm.max_redemptions ? parseInt(dealForm.max_redemptions) : null,
        expires_at: dealForm.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        current_redemptions: 0
      });

      if (error) throw error;
      toast.success('Deal added successfully!');
      setDealForm({
        title: '', description: '', category: 'shopping', original_price: '',
        deal_price: '', discount_percent: '', coupon_code: '', image_url: '',
        location: '', terms_conditions: '', expires_at: '', max_redemptions: ''
      });
      fetchStats();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

const handleAddRestaurant = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('chatr_restaurants').insert({
        name: restaurantForm.name,
        description: restaurantForm.description,
        cuisine_type: restaurantForm.cuisine_type.split(',').map(s => s.trim()),
        address: restaurantForm.address,
        city: restaurantForm.city,
        phone: restaurantForm.phone,
        image_url: restaurantForm.image_url || null,
        price_range: restaurantForm.price_range,
        is_active: true,
        is_verified: true,
        rating_average: 4.0,
        rating_count: 0
      });

      if (error) throw error;
      toast.success('Restaurant added successfully!');
      setRestaurantForm({
        name: '', description: '', cuisine_type: '', address: '', city: '',
        phone: '', image_url: '', price_range: 'medium', delivery_time: '30', minimum_order: ''
      });
      fetchStats();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Chatr World Admin</h1>
                <p className="text-sm text-muted-foreground">Manage listings & content</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <Briefcase className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalJobs}</p>
              <p className="text-xs text-muted-foreground">Jobs</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950 border-red-200 dark:border-red-800">
            <CardContent className="p-4 text-center">
              <Heart className="h-8 w-8 mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalHealthcare}</p>
              <p className="text-xs text-muted-foreground">Healthcare</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4 text-center">
              <Tag className="h-8 w-8 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalDeals}</p>
              <p className="text-xs text-muted-foreground">Deals</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <UtensilsCrossed className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalRestaurants}</p>
              <p className="text-xs text-muted-foreground">Restaurants</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalApplications}</p>
              <p className="text-xs text-muted-foreground">Applications</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 border-teal-200 dark:border-teal-800">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto text-teal-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalAppointments}</p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="healthcare" className="gap-2">
              <Heart className="h-4 w-4" /> Healthcare
            </TabsTrigger>
            <TabsTrigger value="deals" className="gap-2">
              <Tag className="h-4 w-4" /> Deals
            </TabsTrigger>
            <TabsTrigger value="food" className="gap-2">
              <UtensilsCrossed className="h-4 w-4" /> Food
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle>Add New Job</CardTitle>
                <CardDescription>Create a new job listing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Job Title *</Label>
                    <Input
                      value={jobForm.title}
                      onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                      placeholder="e.g. Senior React Developer"
                    />
                  </div>
                  <div>
                    <Label>Company Name *</Label>
                    <Input
                      value={jobForm.company_name}
                      onChange={(e) => setJobForm({...jobForm, company_name: e.target.value})}
                      placeholder="e.g. Tech Corp"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm({...jobForm, description: e.target.value})}
                    placeholder="Job description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={jobForm.location}
                      onChange={(e) => setJobForm({...jobForm, location: e.target.value})}
                      placeholder="e.g. Mumbai, India"
                    />
                  </div>
                  <div>
                    <Label>Job Type</Label>
                    <Select value={jobForm.job_type} onValueChange={(v) => setJobForm({...jobForm, job_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Experience (years)</Label>
                    <Input
                      type="number"
                      value={jobForm.experience_years}
                      onChange={(e) => setJobForm({...jobForm, experience_years: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Min Salary (₹)</Label>
                    <Input
                      type="number"
                      value={jobForm.salary_min}
                      onChange={(e) => setJobForm({...jobForm, salary_min: e.target.value})}
                      placeholder="e.g. 500000"
                    />
                  </div>
                  <div>
                    <Label>Max Salary (₹)</Label>
                    <Input
                      type="number"
                      value={jobForm.salary_max}
                      onChange={(e) => setJobForm({...jobForm, salary_max: e.target.value})}
                      placeholder="e.g. 1200000"
                    />
                  </div>
                  <div>
                    <Label>Salary Type</Label>
                    <Select value={jobForm.salary_type} onValueChange={(v) => setJobForm({...jobForm, salary_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Per Year</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="hour">Per Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Skills (comma separated)</Label>
                  <Input
                    value={jobForm.skills}
                    onChange={(e) => setJobForm({...jobForm, skills: e.target.value})}
                    placeholder="React, TypeScript, Node.js"
                  />
                </div>

                <Button onClick={handleAddJob} disabled={loading || !jobForm.title || !jobForm.company_name}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Job
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Healthcare Tab */}
          <TabsContent value="healthcare">
            <Card>
              <CardHeader>
                <CardTitle>Add Healthcare Provider</CardTitle>
                <CardDescription>Add a doctor, clinic, or hospital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={healthcareForm.name}
                      onChange={(e) => setHealthcareForm({...healthcareForm, name: e.target.value})}
                      placeholder="e.g. Dr. John Doe"
                    />
                  </div>
                  <div>
                    <Label>Provider Type</Label>
                    <Select value={healthcareForm.provider_type} onValueChange={(v) => setHealthcareForm({...healthcareForm, provider_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="clinic">Clinic</SelectItem>
                        <SelectItem value="hospital">Hospital</SelectItem>
                        <SelectItem value="lab">Lab</SelectItem>
                        <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Specialty</Label>
                    <Select value={healthcareForm.specialty} onValueChange={(v) => setHealthcareForm({...healthcareForm, specialty: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['General Physician', 'Dentist', 'Dermatologist', 'Gynecologist', 'Pediatrician', 'Orthopedic', 'ENT', 'Cardiologist', 'Neurologist', 'Ophthalmologist'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Consultation Fee (₹)</Label>
                    <Input
                      type="number"
                      value={healthcareForm.consultation_fee}
                      onChange={(e) => setHealthcareForm({...healthcareForm, consultation_fee: e.target.value})}
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={healthcareForm.description}
                    onChange={(e) => setHealthcareForm({...healthcareForm, description: e.target.value})}
                    placeholder="About the provider..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={healthcareForm.address}
                      onChange={(e) => setHealthcareForm({...healthcareForm, address: e.target.value})}
                      placeholder="Full address"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={healthcareForm.city}
                      onChange={(e) => setHealthcareForm({...healthcareForm, city: e.target.value})}
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={healthcareForm.phone}
                      onChange={(e) => setHealthcareForm({...healthcareForm, phone: e.target.value})}
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <Label>Opening Time</Label>
                    <Input
                      type="time"
                      value={healthcareForm.opening_time}
                      onChange={(e) => setHealthcareForm({...healthcareForm, opening_time: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Closing Time</Label>
                    <Input
                      type="time"
                      value={healthcareForm.closing_time}
                      onChange={(e) => setHealthcareForm({...healthcareForm, closing_time: e.target.value})}
                    />
                  </div>
                </div>

                <Button onClick={handleAddHealthcare} disabled={loading || !healthcareForm.name}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Provider
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals">
            <Card>
              <CardHeader>
                <CardTitle>Add New Deal</CardTitle>
                <CardDescription>Create a new offer or discount</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Deal Title *</Label>
                    <Input
                      value={dealForm.title}
                      onChange={(e) => setDealForm({...dealForm, title: e.target.value})}
                      placeholder="e.g. 50% off on Electronics"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={dealForm.category} onValueChange={(v) => setDealForm({...dealForm, category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['shopping', 'food', 'travel', 'healthcare', 'jobs', 'services', 'entertainment'].map(c => (
                          <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={dealForm.description}
                    onChange={(e) => setDealForm({...dealForm, description: e.target.value})}
                    placeholder="Deal description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Original Price (₹)</Label>
                    <Input
                      type="number"
                      value={dealForm.original_price}
                      onChange={(e) => setDealForm({...dealForm, original_price: e.target.value})}
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <Label>Deal Price (₹)</Label>
                    <Input
                      type="number"
                      value={dealForm.deal_price}
                      onChange={(e) => setDealForm({...dealForm, deal_price: e.target.value})}
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <Label>Coupon Code</Label>
                    <Input
                      value={dealForm.coupon_code}
                      onChange={(e) => setDealForm({...dealForm, coupon_code: e.target.value.toUpperCase()})}
                      placeholder="SAVE50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={dealForm.location}
                      onChange={(e) => setDealForm({...dealForm, location: e.target.value})}
                      placeholder="All India / City"
                    />
                  </div>
                  <div>
                    <Label>Expires At</Label>
                    <Input
                      type="datetime-local"
                      value={dealForm.expires_at}
                      onChange={(e) => setDealForm({...dealForm, expires_at: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Max Redemptions</Label>
                    <Input
                      type="number"
                      value={dealForm.max_redemptions}
                      onChange={(e) => setDealForm({...dealForm, max_redemptions: e.target.value})}
                      placeholder="100"
                    />
                  </div>
                </div>

                <Button onClick={handleAddDeal} disabled={loading || !dealForm.title}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Deal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Food Tab */}
          <TabsContent value="food">
            <Card>
              <CardHeader>
                <CardTitle>Add Restaurant</CardTitle>
                <CardDescription>Add a new restaurant or food outlet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Restaurant Name *</Label>
                    <Input
                      value={restaurantForm.name}
                      onChange={(e) => setRestaurantForm({...restaurantForm, name: e.target.value})}
                      placeholder="e.g. Pizza Palace"
                    />
                  </div>
                  <div>
                    <Label>Cuisine Type</Label>
                    <Input
                      value={restaurantForm.cuisine_type}
                      onChange={(e) => setRestaurantForm({...restaurantForm, cuisine_type: e.target.value})}
                      placeholder="e.g. Italian, Indian, Chinese"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={restaurantForm.description}
                    onChange={(e) => setRestaurantForm({...restaurantForm, description: e.target.value})}
                    placeholder="About the restaurant..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={restaurantForm.address}
                      onChange={(e) => setRestaurantForm({...restaurantForm, address: e.target.value})}
                      placeholder="Full address"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={restaurantForm.city}
                      onChange={(e) => setRestaurantForm({...restaurantForm, city: e.target.value})}
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={restaurantForm.phone}
                      onChange={(e) => setRestaurantForm({...restaurantForm, phone: e.target.value})}
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <Label>Price Range</Label>
                    <Select value={restaurantForm.price_range} onValueChange={(v) => setRestaurantForm({...restaurantForm, price_range: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="budget">Budget (₹)</SelectItem>
                        <SelectItem value="medium">Medium (₹₹)</SelectItem>
                        <SelectItem value="premium">Premium (₹₹₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Delivery Time (mins)</Label>
                    <Input
                      type="number"
                      value={restaurantForm.delivery_time}
                      onChange={(e) => setRestaurantForm({...restaurantForm, delivery_time: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Min Order (₹)</Label>
                    <Input
                      type="number"
                      value={restaurantForm.minimum_order}
                      onChange={(e) => setRestaurantForm({...restaurantForm, minimum_order: e.target.value})}
                      placeholder="100"
                    />
                  </div>
                </div>

                <Button onClick={handleAddRestaurant} disabled={loading || !restaurantForm.name}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Restaurant
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
