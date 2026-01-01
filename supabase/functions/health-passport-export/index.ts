import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { format } = await req.json();

    // Fetch all health data
    const [
      { data: passport },
      { data: profile },
      { data: prescriptions },
      { data: vaccinations },
      { data: vitals },
      { data: labReports },
      { data: appointments },
      { data: bmiRecords },
      { data: assessments }
    ] = await Promise.all([
      supabase.from('health_passport').select('*').eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('prescriptions').select('*').eq('user_id', user.id).order('prescribed_date', { ascending: false }),
      supabase.from('vaccination_records').select('*').eq('user_id', user.id).order('date_administered', { ascending: false }),
      supabase.from('health_vitals').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(50),
      supabase.from('lab_reports').select('*').eq('user_id', user.id).order('test_date', { ascending: false }),
      supabase.from('appointments').select('*').eq('patient_id', user.id).order('appointment_date', { ascending: false }).limit(20),
      supabase.from('bmi_records').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(10),
      supabase.from('mental_health_assessments').select('*').eq('user_id', user.id).order('assessed_at', { ascending: false }).limit(10)
    ]);

    if (format === 'json') {
      // Export as comprehensive JSON
      const exportData = {
        export_date: new Date().toISOString(),
        export_version: '1.0',
        personal_info: {
          name: passport?.full_name || profile?.username,
          date_of_birth: passport?.date_of_birth,
          blood_type: passport?.blood_type,
          passport_number: passport?.passport_number,
          gender: profile?.gender
        },
        medical_info: {
          allergies: passport?.allergies || [],
          chronic_conditions: passport?.chronic_conditions || [],
          current_medications: passport?.current_medications || [],
          family_history: passport?.family_medical_history,
          implanted_devices: passport?.implanted_devices,
          organ_donor: passport?.organ_donor,
          dnr_order: passport?.dnr_order
        },
        emergency_contacts: passport?.emergency_contacts || [],
        healthcare_providers: {
          primary_physician: {
            name: passport?.primary_physician_name,
            contact: passport?.primary_physician_contact
          },
          specialists: passport?.specialists || [],
          preferred_hospital: passport?.preferred_hospital
        },
        insurance: {
          provider: passport?.insurance_provider,
          number: passport?.insurance_number
        },
        prescriptions: prescriptions || [],
        vaccinations: vaccinations || [],
        vitals_history: vitals || [],
        lab_reports: labReports || [],
        appointments: appointments || [],
        bmi_records: bmiRecords || [],
        mental_health_assessments: assessments?.map(a => ({
          type: a.assessment_type,
          score: a.score,
          interpretation: a.interpretation,
          date: a.assessed_at
        })) || []
      };

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: exportData,
          filename: `health_passport_${new Date().toISOString().split('T')[0]}.json`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate HTML for PDF conversion (client-side)
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Health Passport - ${passport?.full_name || profile?.username}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #6B46C1; border-bottom: 2px solid #6B46C1; padding-bottom: 10px; }
    h2 { color: #4C51BF; margin-top: 30px; }
    .section { margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .field { margin-bottom: 10px; }
    .label { color: #666; font-size: 12px; }
    .value { font-weight: bold; }
    .alert { background: #FED7D7; border: 1px solid #FC8181; padding: 10px; border-radius: 5px; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #F7FAFC; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
    .qr-placeholder { text-align: center; padding: 20px; border: 1px dashed #ddd; }
  </style>
</head>
<body>
  <h1>🏥 Health Passport</h1>
  <p><strong>Passport ID:</strong> ${passport?.passport_number || 'N/A'}</p>
  <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>

  <div class="section">
    <h2>👤 Personal Information</h2>
    <div class="grid">
      <div class="field">
        <div class="label">Full Name</div>
        <div class="value">${passport?.full_name || profile?.username || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="label">Date of Birth</div>
        <div class="value">${passport?.date_of_birth || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="label">Blood Type</div>
        <div class="value">${passport?.blood_type || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="label">Gender</div>
        <div class="value">${profile?.gender || 'N/A'}</div>
      </div>
    </div>
  </div>

  ${(passport?.allergies?.length > 0) ? `
  <div class="section">
    <h2>⚠️ Allergies</h2>
    <div class="alert">
      ${passport.allergies.join(', ')}
    </div>
  </div>
  ` : ''}

  ${(passport?.chronic_conditions?.length > 0) ? `
  <div class="section">
    <h2>❤️ Chronic Conditions</h2>
    <div class="alert">
      ${passport.chronic_conditions.join(', ')}
    </div>
  </div>
  ` : ''}

  ${(passport?.current_medications?.length > 0) ? `
  <div class="section">
    <h2>💊 Current Medications</h2>
    <table>
      <tr><th>Medication</th><th>Dosage</th><th>Frequency</th></tr>
      ${passport.current_medications.map((m: any) => `
        <tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td></tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  ${(vaccinations && vaccinations.length > 0) ? `
  <div class="section">
    <h2>💉 Vaccination History</h2>
    <table>
      <tr><th>Vaccine</th><th>Dose</th><th>Date</th></tr>
      ${vaccinations.slice(0, 10).map((v: any) => `
        <tr><td>${v.vaccine_name}</td><td>${v.dose_number}</td><td>${v.date_administered}</td></tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  ${(passport?.emergency_contacts?.length > 0) ? `
  <div class="section">
    <h2>🆘 Emergency Contacts</h2>
    <table>
      <tr><th>Name</th><th>Relationship</th><th>Phone</th></tr>
      ${passport.emergency_contacts.map((c: any) => `
        <tr><td>${c.name}</td><td>${c.relationship}</td><td>${c.phone}</td></tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h2>🏥 Healthcare Providers</h2>
    <div class="grid">
      <div class="field">
        <div class="label">Primary Physician</div>
        <div class="value">${passport?.primary_physician_name || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="label">Contact</div>
        <div class="value">${passport?.primary_physician_contact || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="label">Preferred Hospital</div>
        <div class="value">${passport?.preferred_hospital || 'N/A'}</div>
      </div>
    </div>
  </div>

  ${passport?.insurance_provider ? `
  <div class="section">
    <h2>🛡️ Insurance Information</h2>
    <div class="grid">
      <div class="field">
        <div class="label">Provider</div>
        <div class="value">${passport.insurance_provider}</div>
      </div>
      <div class="field">
        <div class="label">Policy Number</div>
        <div class="value">${passport.insurance_number || 'N/A'}</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>📋 Medical Directives</h2>
    <div class="grid">
      <div class="field">
        <div class="label">Organ Donor</div>
        <div class="value">${passport?.organ_donor ? 'Yes' : 'No'}</div>
      </div>
      <div class="field">
        <div class="label">DNR Order</div>
        <div class="value">${passport?.dnr_order ? 'Yes' : 'No'}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This document was generated from Chatr Health Passport</p>
    <p>For verification, scan the QR code in the app or visit chatr.chat</p>
    <p>Document ID: ${passport?.id || 'N/A'}</p>
  </div>
</body>
</html>`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        html: htmlContent,
        filename: `health_passport_${new Date().toISOString().split('T')[0]}.html`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health passport export error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
