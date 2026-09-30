export const SUPABASE_URL = 'https://aevskbhlpuegddcywuah.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Hs_CPPO3kQfC-XWJQ0BMYQ_NfYFJPz2';

export type DatabaseProduct = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
  sizes: string[];
  active: boolean;
  stock: number;
  video_url: string;
};

export type OrderItem = { id: number; product_name: string; size: string; quantity: number; unit_price: number; subtotal: number };
export type Order = { id: string; customer_name: string; customer_phone: string; customer_address: string; total: number; status: string; created_at: string; order_items: OrderItem[] };
export type SiteSettings = {
  brand_name: string; logo_url: string; hero_badge: string; hero_title: string; hero_text: string; hero_button: string; hero_image_url: string;
  accent_color: string; catalogue_label: string; catalogue_title: string; catalogue_text: string;
  benefit1_title: string; benefit1_text: string; benefit2_title: string; benefit2_text: string; benefit3_title: string; benefit3_text: string;
  step1_title: string; step1_text: string; step2_title: string; step2_text: string; step3_title: string; step3_text: string;
  footer_tagline: string; footer_text: string; whatsapp_number: string;
};
export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: 'ABAYA COLLECTIONS', logo_url: '/logo.png', hero_badge: 'NOUVELLE COLLECTION', hero_title: 'Élégance.|Tradition.|Modernité.', hero_text: 'Découvrez nos magnifiques Abayas, pensées pour révéler votre élégance.', hero_button: 'Découvrir la collection', hero_image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=1600', accent_color: '#6f42c1', catalogue_label: 'NOTRE SÉLECTION', catalogue_title: 'Nos Abayas', catalogue_text: 'Des modèles élégants pour toutes les occasions.', benefit1_title: 'Qualité sélectionnée', benefit1_text: 'Des abayas choisies avec soin.', benefit2_title: 'Livraison disponible', benefit2_text: 'Confirmation par WhatsApp.', benefit3_title: 'Commande suivie', benefit3_text: 'Chaque commande est enregistrée.', step1_title: 'Choisissez', step1_text: 'Sélectionnez le modèle et la taille.', step2_title: 'Validez', step2_text: 'Indiquez vos coordonnées de livraison.', step3_title: 'Confirmez', step3_text: 'WhatsApp s’ouvre avec votre commande complète.', footer_tagline: 'Élégance • Tradition • Modernité', footer_text: 'Livraison et paiement confirmés avant validation.', whatsapp_number: '22370303193',
};

export async function getProducts(includeInactive = false, token?: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.asc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
      },
    },
  );
  if (!response.ok) throw new Error('Impossible de charger les produits');
  const products = (await response.json()) as DatabaseProduct[];
  return includeInactive ? products : products.filter((product) => product.active);
}

export async function createOrder(customer: { name: string; phone: string; address: string }, items: { product_id: number; size: string; quantity: number }[]) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_order`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_customer_name: customer.name, p_customer_phone: customer.phone, p_customer_address: customer.address, p_items: items }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'La commande n\'a pas pu être enregistrée.');
  return data as { order_id: string; total: number };
}

export async function getOrders(token: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&order=created_at.desc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Impossible de charger les commandes');
  return response.json() as Promise<Order[]>;
}

export async function getSiteSettings(token?: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=content`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } });
  if (!response.ok) return DEFAULT_SETTINGS;
  const rows = await response.json() as { content: Partial<SiteSettings> }[];
  return { ...DEFAULT_SETTINGS, ...(rows[0]?.content || {}) };
}
