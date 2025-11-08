import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { city, latitude, longitude } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? ''
    );

    // Sample healthcare data based on location
    const sampleProviders = [
      {
        name: 'Apollo Clinic',
        type: 'clinic',
        description: 'Multi-specialty clinic with experienced doctors',
        address: 'Main Street, Near City Center',
        city: city || 'Mumbai',
        pincode: '400001',
        phone_number: '+91-22-12345678',
        specialties: ['General Medicine', 'Pediatrics', 'Dermatology'],
        services_offered: ['Consultation', 'Laboratory', 'Pharmacy'],
        rating_average: 4.5,
        rating_count: 120,
        verified: true,
        is_monetized: false
      },
      {
        name: 'City General Hospital',
        type: 'hospital',
        description: '24/7 emergency and multi-specialty hospital',
        address: 'Hospital Road, Central Area',
        city: city || 'Mumbai',
        pincode: '400002',
        phone_number: '+91-22-23456789',
        specialties: ['Emergency', 'Surgery', 'Cardiology', 'Orthopedics'],
        services_offered: ['Emergency', 'ICU', 'Surgery', 'Diagnostics'],
        rating_average: 4.2,
        rating_count: 250,
        verified: true,
        is_monetized: false
      },
      {
        name: 'MedPlus Pharmacy',
        type: 'pharmacy',
        description: 'Trusted pharmacy with wide range of medicines',
        address: 'Market Square, Shopping District',
        city: city || 'Mumbai',
        pincode: '400003',
        phone_number: '+91-22-34567890',
        specialties: ['Prescription Medicines', 'OTC Products'],
        services_offered: ['Home Delivery', 'Online Orders'],
        rating_average: 4.0,
        rating_count: 80,
        verified: true,
        is_monetized: false
      },
      {
        name: 'HealthCare Diagnostics',
        type: 'lab',
        description: 'Advanced diagnostic center with modern equipment',
        address: 'Medical Complex, Healthcare Zone',
        city: city || 'Mumbai',
        pincode: '400004',
        phone_number: '+91-22-45678901',
        specialties: ['Blood Tests', 'X-Ray', 'Ultrasound', 'CT Scan'],
        services_offered: ['Pathology', 'Radiology', 'Home Collection'],
        rating_average: 4.3,
        rating_count: 150,
        verified: true,
        is_monetized: false
      },
      {
        name: 'Family Care Clinic',
        type: 'clinic',
        description: 'Family healthcare with personalized attention',
        address: 'Residential Area, Park Lane',
        city: city || 'Mumbai',
        pincode: '400005',
        phone_number: '+91-22-56789012',
        specialties: ['Family Medicine', 'Vaccination', 'Health Checkups'],
        services_offered: ['Consultation', 'Preventive Care'],
        rating_average: 4.6,
        rating_count: 95,
        verified: true,
        is_monetized: false
      }
    ];

    // Insert healthcare providers into database
    const { data, error } = await supabaseClient
      .from('healthcare_db')
      .upsert(sampleProviders, { onConflict: 'name,city', ignoreDuplicates: true });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, count: sampleProviders.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
