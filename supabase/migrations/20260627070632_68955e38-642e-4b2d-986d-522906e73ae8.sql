create table if not exists public.message_security_scans (
    id uuid primary key default gen_random_uuid(),
    message_id uuid references public.messages(id) on delete cascade not null,
    overall_score integer not null default 0,
    overall_level text not null default 'safe',
    detections jsonb not null default '{}'::jsonb,
    explanation jsonb,
    recommended_action text,
    scanned_at timestamptz default now()
);

GRANT SELECT, UPDATE ON public.message_security_scans TO authenticated;
GRANT ALL ON public.message_security_scans TO service_role;

alter table public.message_security_scans enable row level security;

create policy "Users can view security scans for their messages"
on public.message_security_scans for select
using (
  exists (
    select 1 from public.messages m
    where m.id = message_security_scans.message_id
    and (
      m.sender_id = auth.uid()
      or exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = m.conversation_id
        and cp.user_id = auth.uid()
      )
    )
  )
);

create policy "Service role can insert security scans"
on public.message_security_scans for insert
with check (true);

create policy "Users can update their scans to provide feedback"
on public.message_security_scans for update
using (
  exists (
    select 1 from public.messages m
    where m.id = message_security_scans.message_id
    and (
      m.sender_id = auth.uid()
      or exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = m.conversation_id
        and cp.user_id = auth.uid()
      )
    )
  )
);

create index idx_message_security_scans_message_id on public.message_security_scans(message_id);