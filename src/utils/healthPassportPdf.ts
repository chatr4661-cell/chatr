import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

interface PassportExport {
  export_date: string;
  personal_info: Record<string, any>;
  medical_info: Record<string, any>;
  emergency_contacts: any[];
  healthcare_providers: Record<string, any>;
  insurance: Record<string, any>;
  prescriptions: any[];
  vaccinations: any[];
  vitals_history: any[];
  lab_reports: any[];
  appointments: any[];
  bmi_records: any[];
  mental_health_assessments: any[];
}

/**
 * Build a clean, multi-section PDF from the health passport export payload.
 */
export function buildHealthPassportPdf(data: PassportExport): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (needed = 20) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text: string) => {
    ensureSpace(34);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin + 8, y + 15);
    y += 32;
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };

  const line = (label: string, value: any) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return;
    ensureSpace(16);
    const text = Array.isArray(value) ? value.join(', ') : String(value);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    const labelW = doc.getTextWidth(`${label}: `) + 6;
    const wrapped = doc.splitTextToSize(text, pageWidth - margin * 2 - labelW);
    doc.text(wrapped, margin + labelW, y);
    y += 14 * wrapped.length;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Health Passport', margin, y + 6);
  y += 26;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${new Date(data.export_date).toLocaleString()}  •  Chatr — A product of Talentxcel Services Pvt Ltd`, margin, y);
  y += 22;

  const p = data.personal_info || {};
  heading('Personal Information');
  line('Name', p.name);
  line('Date of Birth', p.date_of_birth);
  line('Gender', p.gender);
  line('Blood Type', p.blood_type);
  line('Passport No.', p.passport_number);

  const m = data.medical_info || {};
  heading('Medical Information');
  line('Allergies', m.allergies);
  line('Chronic Conditions', m.chronic_conditions);
  line('Current Medications', (m.current_medications || []).map((x: any) => (typeof x === 'string' ? x : x.name)).filter(Boolean));
  line('Family History', m.family_history);
  line('Implanted Devices', m.implanted_devices);
  line('Organ Donor', m.organ_donor ? 'Yes' : undefined);
  line('DNR Order', m.dnr_order ? 'Yes' : undefined);

  if ((data.emergency_contacts || []).length) {
    heading('Emergency Contacts');
    data.emergency_contacts.forEach((c: any) => line(c.name || 'Contact', `${c.phone || ''} ${c.relationship ? `(${c.relationship})` : ''}`.trim()));
  }

  const hp = data.healthcare_providers || {};
  if (hp.primary_physician?.name || hp.preferred_hospital) {
    heading('Healthcare Providers');
    line('Primary Physician', hp.primary_physician?.name);
    line('Physician Contact', hp.primary_physician?.contact);
    line('Preferred Hospital', hp.preferred_hospital);
  }

  if (data.insurance?.provider) {
    heading('Insurance');
    line('Provider', data.insurance.provider);
    line('Policy No.', data.insurance.number);
  }

  if ((data.prescriptions || []).length) {
    heading('Prescriptions');
    data.prescriptions.slice(0, 30).forEach((rx: any) =>
      line(rx.medication_name || 'Medication', `${rx.dosage || ''} ${rx.frequency || ''} ${rx.prescribed_date ? `— ${new Date(rx.prescribed_date).toLocaleDateString()}` : ''}`.trim())
    );
  }

  if ((data.vaccinations || []).length) {
    heading('Vaccinations');
    data.vaccinations.slice(0, 30).forEach((v: any) =>
      line(v.vaccine_name || 'Vaccine', `Dose ${v.dose_number || 1} ${v.date_administered ? `— ${new Date(v.date_administered).toLocaleDateString()}` : ''}`.trim())
    );
  }

  if ((data.lab_reports || []).length) {
    heading('Recent Lab Reports');
    data.lab_reports.slice(0, 20).forEach((l: any) =>
      line(l.test_name || l.report_type || 'Report', l.test_date ? new Date(l.test_date).toLocaleDateString() : '')
    );
  }

  if ((data.vitals_history || []).length) {
    heading('Recent Vitals');
    data.vitals_history.slice(0, 20).forEach((v: any) =>
      line(v.vital_type || 'Vital', `${typeof v.value === 'object' ? JSON.stringify(v.value) : v.value} ${v.recorded_at ? `— ${new Date(v.recorded_at).toLocaleDateString()}` : ''}`.trim())
    );
  }

  return doc;
}

function buildFilename() {
  return `health_passport_${new Date().toISOString().split('T')[0]}.pdf`;
}

/**
 * Download (web) or save+share (native) the generated PDF.
 * action: 'download' triggers a save; 'share' opens the native/web share sheet.
 */
export async function deliverHealthPassportPdf(doc: jsPDF, action: 'download' | 'share'): Promise<void> {
  const filename = buildFilename();

  if (Capacitor.isNativePlatform()) {
    const base64 = doc.output('datauristring').split(',')[1];
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    } as any).catch(async () => {
      // Some platforms require omitting encoding for base64
      return Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
    });

    await Share.share({
      title: 'Health Passport',
      text: 'My Health Passport (securely shared from Chatr)',
      url: (written as any).uri,
      dialogTitle: 'Share Health Passport',
    });
    return;
  }

  // Web: use Web Share API with a file when supported, else download
  const blob = doc.output('blob');
  if (action === 'share' && typeof navigator !== 'undefined' && (navigator as any).canShare) {
    const file = new File([blob], filename, { type: 'application/pdf' });
    if ((navigator as any).canShare({ files: [file] })) {
      await (navigator as any).share({
        title: 'Health Passport',
        text: 'My Health Passport (securely shared from Chatr)',
        files: [file],
      });
      return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
