import { SUPABASE_KEY, SUPABASE_URL } from './supabase';

export type BlockType = 'title' | 'text' | 'image' | 'hero' | 'products' | 'categories' | 'button' | 'gallery' | 'video' | 'testimonials' | 'faq' | 'contact' | 'whatsapp' | 'divider' | 'spacer' | 'html';
export type CmsBlock = { id: string; type: BlockType; visible: boolean; content: Record<string, string> };
export type CmsSection = { id: string; name: string; visible: boolean; blocks: CmsBlock[] };
export type PageContent = { sections: CmsSection[] };
export type CmsPage = { id: string; slug: string; title: string; navigation_label: string; seo_title?: string; seo_description?: string; is_home: boolean; is_visible: boolean; position: number; draft: PageContent; published: PageContent; published_at?: string };
export type Branding = { brand_name: string; domain: string; logo_url: string; favicon_url: string; colors: { accent: string; text: string; background: string }; typography: { heading: string; body: string }; header: { showCart: boolean }; footer: { tagline: string; text: string; whatsapp: string } };

export const uid = () => crypto.randomUUID();
export const emptyPage = (title = 'Nouvelle page'): Omit<CmsPage, 'id'> => ({ slug: 'nouvelle-page', title, navigation_label: title, is_home: false, is_visible: true, position: 0, draft: { sections: [] }, published: { sections: [] } });

async function api(path: string, token?: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (!response.ok) throw new Error(await response.text() || 'Opération impossible.');
  return response.status === 204 ? null : response.json();
}
export const getPages = (token?: string) => api('cms_pages?select=*&order=position.asc', token) as Promise<CmsPage[]>;
export const getPublicPages = () => api('cms_pages_public?select=*&order=position.asc') as Promise<CmsPage[]>;
export const getPublicPage = async (slug: string) => { const rows = await api(`cms_pages_public?slug=eq.${encodeURIComponent(slug)}&select=*`, undefined) as CmsPage[]; return rows[0] || null; };
export const createPage = async (page: Omit<CmsPage, 'id'>, token: string) => (await api('cms_pages', token, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(page) }))[0] as CmsPage;
export const updatePage = (id: string, changes: Partial<CmsPage>, token: string) => api(`cms_pages?id=eq.${id}`, token, { method: 'PATCH', body: JSON.stringify(changes) });
export const deletePage = (id: string, token: string) => api(`cms_pages?id=eq.${id}`, token, { method: 'DELETE' });
export const getBranding = async (token?: string) => { const rows = await api('site_branding?select=*', token) as Branding[]; return rows[0] || null; };
export const updateBranding = (branding: Branding, token: string) => api('site_branding?id=eq=true', token, { method: 'PATCH', body: JSON.stringify(branding) });
export const getRevisions = (pageId: string, token: string) => api(`cms_revisions?page_id=eq.${pageId}&select=*&order=created_at.desc`, token) as Promise<{ id: string; content: PageContent; label: string; created_at: string }[]>;
export async function uploadMedia(file: File, folder: string, token: string) {
  if (file.size > 10 * 1024 * 1024) throw new Error('Le fichier doit faire moins de 10 Mo.');
  const name = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${name}`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': file.type }, body: file });
  if (!response.ok) throw new Error('Envoi du média impossible.');
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${name}`;
}
