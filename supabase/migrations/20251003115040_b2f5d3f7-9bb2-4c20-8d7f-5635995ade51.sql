-- Enable realtime for service providers
ALTER PUBLICATION supabase_realtime ADD TABLE service_providers;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_providers_location ON service_providers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments(provider_id);