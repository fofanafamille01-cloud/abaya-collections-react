-- Abaya Collections no-code CMS. Run this migration in the Supabase SQL editor.
-- Public visitors may only read published content; authenticated administrators
-- are the only users who can change pages, revisions and media.

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  navigation_label text not null,
  seo_title text,
  seo_description text,
  is_home boolean not null default false,
  is_visible boolean not null default true,
  position integer not null default 0,
  draft jsonb not null default '{"sections": []}'::jsonb,
  published jsonb not null default '{"sections": []}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cms_pages_single_home on public.cms_pages (is_home) where is_home;

create table if not exists public.cms_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages(id) on delete cascade,
  content jsonb not null,
  label text not null default 'Sauvegarde automatique',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_branding (
  id boolean primary key default true check (id),
  brand_name text not null default 'ABAYA COLLECTIONS',
  domain text not null default 'abaya-collections.com',
  logo_url text not null default '/logo.png',
  favicon_url text not null default '/favicon.svg',
  colors jsonb not null default '{"accent":"#6f42c1","text":"#1d1d1d","background":"#f8f6f3"}'::jsonb,
  typography jsonb not null default '{"heading":"Arial, sans-serif","body":"Arial, sans-serif"}'::jsonb,
  header jsonb not null default '{"showCart":true}'::jsonb,
  footer jsonb not null default '{"tagline":"Élégance • Tradition • Modernité","text":"Livraison et paiement confirmés avant validation.","whatsapp":"22370303193"}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_branding (id) values (true) on conflict (id) do nothing;

-- First no-code homepage. It preserves the purple Abaya Collections identity and
-- can be edited immediately in /admin after the migration.
insert into public.cms_pages (slug, title, navigation_label, is_home, position, draft, published, published_at)
select 'accueil', 'Accueil', 'Accueil', true, 0,
  '{"sections":[{"id":"hero","name":"Bannière d’accueil","visible":true,"blocks":[{"id":"hero-main","type":"hero","visible":true,"content":{"title":"Élégance. Tradition. Modernité.","text":"Découvrez nos magnifiques Abayas, pensées pour révéler votre élégance.","image":"https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=1600","link":"#collection"}}]},{"id":"catalogue","name":"Catalogue","visible":true,"blocks":[{"id":"catalogue-products","type":"products","visible":true,"content":{"title":"Nos Abayas","text":"Des modèles élégants pour toutes les occasions."}}]},{"id":"contact","name":"Contact","visible":true,"blocks":[{"id":"contact-whatsapp","type":"whatsapp","visible":true,"content":{"title":"Une question ?","text":"Notre équipe vous répond sur WhatsApp.","link":"22370303193"}}]}]}'::jsonb,
  '{"sections":[{"id":"hero","name":"Bannière d’accueil","visible":true,"blocks":[{"id":"hero-main","type":"hero","visible":true,"content":{"title":"Élégance. Tradition. Modernité.","text":"Découvrez nos magnifiques Abayas, pensées pour révéler votre élégance.","image":"https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=1600","link":"#collection"}}]},{"id":"catalogue","name":"Catalogue","visible":true,"blocks":[{"id":"catalogue-products","type":"products","visible":true,"content":{"title":"Nos Abayas","text":"Des modèles élégants pour toutes les occasions."}}]},{"id":"contact","name":"Contact","visible":true,"blocks":[{"id":"contact-whatsapp","type":"whatsapp","visible":true,"content":{"title":"Une question ?","text":"Notre équipe vous répond sur WhatsApp.","link":"22370303193"}}]}]}'::jsonb, now()
where not exists (select 1 from public.cms_pages where is_home);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_abaya_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

alter table public.cms_pages enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.site_branding enable row level security;

drop policy if exists "admins can read their role" on public.admin_users;
create policy "admins can read their role" on public.admin_users for select using (user_id = auth.uid());

drop policy if exists "published pages are public" on public.cms_pages;
create policy "published pages are public" on public.cms_pages for select using (is_visible or public.is_abaya_admin());
drop policy if exists "admins manage pages" on public.cms_pages;
create policy "admins manage pages" on public.cms_pages for all using (public.is_abaya_admin()) with check (public.is_abaya_admin());

-- This view deliberately excludes drafts. The shop never receives unpublished content.
create or replace view public.cms_pages_public with (security_invoker = true) as
  select id, slug, title, navigation_label, seo_title, seo_description, is_home,
         is_visible, position, published, published_at
  from public.cms_pages where is_visible = true;
grant select on public.cms_pages_public to anon, authenticated;
drop policy if exists "admins manage revisions" on public.cms_revisions;
create policy "admins manage revisions" on public.cms_revisions for all using (public.is_abaya_admin()) with check (public.is_abaya_admin());
drop policy if exists "branding is public" on public.site_branding;
create policy "branding is public" on public.site_branding for select using (true);
drop policy if exists "admins manage branding" on public.site_branding;
create policy "admins manage branding" on public.site_branding for all using (public.is_abaya_admin()) with check (public.is_abaya_admin());

-- Keep an audit snapshot before every published content change.
create or replace function public.snapshot_cms_revision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.published is distinct from new.published then
    insert into public.cms_revisions(page_id, content, label, created_by)
    values (old.id, old.published, 'Avant publication', auth.uid());
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists cms_pages_snapshot on public.cms_pages;
create trigger cms_pages_snapshot before update on public.cms_pages for each row execute procedure public.snapshot_cms_revision();

-- Add authenticated admin accounts here after creating them in Authentication:
-- insert into public.admin_users (user_id) values ('AUTH-USER-UUID');
