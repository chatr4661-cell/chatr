-- Phase 1 — Administrative tables role-based access via has_role()

-- cc_approvals
ALTER TABLE IF EXISTS public.cc_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view cc_approvals" ON public.cc_approvals;
CREATE POLICY "Admins can view cc_approvals"
  ON public.cc_approvals FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- kyc_documents
ALTER TABLE IF EXISTS public.kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view kyc_documents" ON public.kyc_documents;
CREATE POLICY "Admins can view kyc_documents"
  ON public.kyc_documents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- app_submissions
ALTER TABLE IF EXISTS public.app_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view app_submissions" ON public.app_submissions;
CREATE POLICY "Admins can view app_submissions"
  ON public.app_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- doctor_applications
ALTER TABLE IF EXISTS public.doctor_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view doctor_applications" ON public.doctor_applications;
CREATE POLICY "Admins can view doctor_applications"
  ON public.doctor_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));