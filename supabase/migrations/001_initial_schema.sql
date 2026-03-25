-- ============================================================
-- Konta – Initial Schema Migration
-- ============================================================


-- ============================================================
-- Profiles
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table profiles enable row level security;
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
create policy "Users can delete their own profile" on profiles for delete using (auth.uid() = id);

-- ============================================================
-- Profile logs
-- ============================================================
create table profiles_logs (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  profile_id uuid not null references profiles(id) on delete cascade,
  content jsonb not null default '{}'
);

alter table profiles_logs enable row level security;
create policy "Users can view their own logs" on profiles_logs for select using (profile_id = auth.uid());
create policy "Users can insert own logs" on profiles_logs for insert with check (profile_id = auth.uid());

-- ============================================================
-- Workspaces
-- ============================================================
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branding jsonb
);

alter table workspaces enable row level security;
create policy "Anyone can create workspaces" on workspaces for insert with check (true);

-- ============================================================
-- Workspace logs
-- ============================================================
create table workspaces_logs (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content jsonb not null default '{}'
);

alter table workspaces_logs enable row level security;

-- ============================================================
-- Workspace members
-- ============================================================
create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('owner','member','invited')),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, profile_id)
);

alter table workspace_members enable row level security;
create policy "Members can view workspace membership" on workspace_members for select using (
  workspace_id in (select workspace_id from workspace_members wm2 where wm2.profile_id = auth.uid())
);
create policy "Owners can manage members" on workspace_members for all using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status = 'owner')
);
create policy "Users can view own invites" on workspace_members for select using (profile_id = auth.uid());
create policy "Users can accept invites" on workspace_members for update using (profile_id = auth.uid());
create policy "Users can leave workspace" on workspace_members for delete using (profile_id = auth.uid() and status != 'owner');
create policy "System can insert members" on workspace_members for insert with check (true);

-- ============================================================
-- Deferred policies (require workspace_members to exist)
-- ============================================================
create policy "Workspace members can see profiles" on profiles for select using (
  id in (
    select profile_id from workspace_members
    where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid()
    )
  )
);
create policy "Members can view workspaces" on workspaces for select using (
  id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);
create policy "Owners can update workspaces" on workspaces for update using (
  id in (select workspace_id from workspace_members where profile_id = auth.uid() and status = 'owner')
);
create policy "Owners can delete workspaces" on workspaces for delete using (
  id in (select workspace_id from workspace_members where profile_id = auth.uid() and status = 'owner')
);
create policy "Members can view workspace logs" on workspaces_logs for select using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);

-- ============================================================
-- Projects
-- ============================================================
create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references projects(id) on delete cascade,
  name text not null,
  type text not null check (type in ('project','attendance','rsvp','series')),
  has_children integer not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
create policy "Members can view projects" on projects for select using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);
create policy "Members can create projects" on projects for insert with check (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);
create policy "Members can update projects" on projects for update using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);
create policy "Members can delete projects" on projects for delete using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);

-- ============================================================
-- Attendance objects
-- ============================================================
create table attendance_objects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id),
  name text not null,
  event_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fields jsonb not null default '[{"name":"name","label":"Name","type":"text","required":true,"show_in_table":true},{"name":"email","label":"Email","type":"email","required":true,"show_in_table":true}]',
  active boolean not null default false,
  security_rotatingcode_enabled boolean not null default true,
  security_rotatingcode_interval integer not null default 10,
  security_clientidchecks_enabled boolean not null default false,
  security_clientidchecks_type text not null default 'ignore' check (security_clientidchecks_type in ('block','mark','ignore')),
  email_receipts boolean not null default false,
  branding_enabled boolean not null default true
);

alter table attendance_objects enable row level security;
create policy "Members can view attendance objects" on attendance_objects for select using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);
create policy "Members can manage attendance objects" on attendance_objects for all using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);
-- Public can view active events (needed for QR forms)
create policy "Public can view active attendance objects" on attendance_objects for select using (active = true);

-- ============================================================
-- Attendance codes
-- ============================================================
create table attendance_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references attendance_objects(id) on delete cascade,
  type text not null check (type in ('static','rotating')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table attendance_codes enable row level security;
create policy "Members can manage codes" on attendance_codes for all using (
  event_id in (
    select id from attendance_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Public can read codes" on attendance_codes for select using (true);

-- ============================================================
-- Attendance records
-- ============================================================
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references attendance_objects(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  content jsonb not null default '{}',
  status text not null default 'attended' check (status in ('attended','excused')),
  recorded_with text not null default 'qr' check (recorded_with in ('qr','link','manual','moderator')),
  client_id text,
  client_id_collision text
);

alter table attendance_records enable row level security;
create policy "Members can view records" on attendance_records for select using (
  event_id in (
    select id from attendance_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Members can manage records" on attendance_records for all using (
  event_id in (
    select id from attendance_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Public can insert records" on attendance_records for insert with check (true);

-- ============================================================
-- Attendance moderation links
-- ============================================================
create table attendance_moderation (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references attendance_objects(id) on delete cascade,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table attendance_moderation enable row level security;
create policy "Members can manage moderation links" on attendance_moderation for all using (
  event_id in (
    select id from attendance_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Public can read active moderation links" on attendance_moderation for select using (active = true);

-- ============================================================
-- Attendance excuse links
-- ============================================================
create table attendance_excuselinks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references attendance_objects(id) on delete cascade,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table attendance_excuselinks enable row level security;
create policy "Members can manage excuse links" on attendance_excuselinks for all using (
  event_id in (
    select id from attendance_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Public can read active excuse links" on attendance_excuselinks for select using (active = true);

-- ============================================================
-- RSVP objects
-- ============================================================
create table rsvp_objects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id),
  name text not null,
  event_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fields jsonb not null default '[{"name":"name","label":"Name","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true}]',
  active boolean not null default true,
  email_receipts boolean not null default false,
  branding_enabled boolean not null default true
);

alter table rsvp_objects enable row level security;
create policy "Members can manage rsvp objects" on rsvp_objects for all using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);
create policy "Public can view active rsvp objects" on rsvp_objects for select using (active = true);

-- ============================================================
-- RSVP links
-- ============================================================
create table rsvp_links (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references rsvp_objects(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  open_count integer not null default 0,
  fill_count integer not null default 0,
  active boolean not null default true
);

alter table rsvp_links enable row level security;
create policy "Members can manage rsvp links" on rsvp_links for all using (
  rsvp_id in (
    select id from rsvp_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Public can read active rsvp links" on rsvp_links for select using (active = true);
create policy "Public can update rsvp link counts" on rsvp_links for update using (true);

-- ============================================================
-- RSVP records
-- ============================================================
create table rsvp_records (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references rsvp_objects(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  content jsonb not null default '{}'
);

alter table rsvp_records enable row level security;
create policy "Members can view rsvp records" on rsvp_records for select using (
  rsvp_id in (
    select id from rsvp_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Members can delete rsvp records" on rsvp_records for delete using (
  rsvp_id in (
    select id from rsvp_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Public can insert rsvp records" on rsvp_records for insert with check (true);

-- ============================================================
-- Series objects
-- ============================================================
create table series_objects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  combine_on text not null default 'email'
);

alter table series_objects enable row level security;
create policy "Members can manage series" on series_objects for all using (
  workspace_id in (select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member'))
);

-- ============================================================
-- Series events
-- ============================================================
create table series_events (
  series_id uuid not null references series_objects(id) on delete cascade,
  event_id uuid not null references attendance_objects(id) on delete cascade,
  weight integer not null default 1,
  primary key (series_id, event_id)
);

alter table series_events enable row level security;
create policy "Members can manage series events" on series_events for all using (
  series_id in (
    select id from series_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);

-- ============================================================
-- Series collisions
-- ============================================================
create table series_collisions (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series_objects(id) on delete cascade,
  field_name text not null,
  first_value text not null,
  second_value text not null,
  chosen_value text,
  dismissed_at timestamptz,
  dismissed_by uuid references profiles(id)
);

alter table series_collisions enable row level security;
create policy "Members can manage series collisions" on series_collisions for all using (
  series_id in (
    select id from series_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);

-- ============================================================
-- Series review links
-- ============================================================
create table series_review_links (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series_objects(id) on delete cascade,
  label text not null,
  active boolean not null default true,
  show_graph boolean not null default true,
  member_review text not null default 'deactivated' check (member_review in ('deactivated','own_public','own_email','all_public','all_email'))
);

alter table series_review_links enable row level security;
create policy "Members can manage series review links" on series_review_links for all using (
  series_id in (
    select id from series_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);

-- ============================================================
-- Series review logs
-- ============================================================
create table series_review_logs (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series_objects(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  email text
);

alter table series_review_logs enable row level security;
create policy "Members can view series review logs" on series_review_logs for select using (
  series_id in (
    select id from series_objects where workspace_id in (
      select workspace_id from workspace_members where profile_id = auth.uid() and status in ('owner','member')
    )
  )
);
create policy "Public can insert series review logs" on series_review_logs for insert with check (true);

-- ============================================================
-- Triggers: auto-create profile on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, email, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    now()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Triggers: auto-create default workspace on first signup
-- ============================================================
create or replace function handle_new_profile()
returns trigger language plpgsql security definer as $$
declare
  ws_id uuid;
begin
  insert into workspaces (name) values (new.name || '''s workspace') returning id into ws_id;
  insert into workspace_members (workspace_id, profile_id, status) values (ws_id, new.id, 'owner');
  return new;
end;
$$;

create trigger on_profile_created
  after insert on profiles
  for each row execute function handle_new_profile();

-- ============================================================
-- Triggers: update updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger attendance_objects_updated_at before update on attendance_objects for each row execute function update_updated_at();
create trigger rsvp_objects_updated_at before update on rsvp_objects for each row execute function update_updated_at();
create trigger series_objects_updated_at before update on series_objects for each row execute function update_updated_at();

-- ============================================================
-- Realtime: enable realtime for key tables
-- ============================================================
alter publication supabase_realtime add table attendance_objects;
alter publication supabase_realtime add table attendance_records;
alter publication supabase_realtime add table attendance_codes;
alter publication supabase_realtime add table workspace_members;
