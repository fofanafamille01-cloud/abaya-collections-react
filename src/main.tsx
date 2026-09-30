import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import Admin from './Admin';
import { createOrder, DatabaseProduct, DEFAULT_SETTINGS, getProducts, getSiteSettings } from './supabase';
import { Branding, CmsBlock, CmsPage, getBranding, getPublicPage, getPublicPages } from './cms';
import abaya1 from './assets/abaya1.jpg';
import abaya2 from './assets/abaya2.jpg';
import abaya3 from './assets/abaya3.jpg';

type CartItem = DatabaseProduct & { size: string; quantity: number };
const money = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;
const key = (item: Pick<CartItem, 'id' | 'size'>) => `${item.id}-${item.size}`;
const productImage = (product: Pick<DatabaseProduct, 'name' | 'image_url'>) => {
  if (product.image_url.includes('/assets/abaya1-') || product.name === 'Abaya Élégance') return abaya1;
  if (product.image_url.includes('/assets/abaya2-') || product.name === 'Abaya Prestige') return abaya2;
  if (product.image_url.includes('/assets/abaya3-') || product.name === 'Abaya Royale') return abaya3;
  return product.image_url;
};

function CmsBlockView({ block, products }: { block: CmsBlock; products: DatabaseProduct[] }) {
  if (!block.visible) return null;
  const c = block.content;
  if (block.type === 'spacer') return <div className="cms-spacer" />;
  if (block.type === 'divider') return <hr className="cms-divider" />;
  if (block.type === 'title') return <section className="cms-public"><h1>{c.title}</h1><p>{c.text}</p></section>;
  if (block.type === 'text') return <section className="cms-public"><h2>{c.title}</h2><p className="cms-rich-text">{c.text}</p></section>;
  if (block.type === 'image') return <section className="cms-public"><img src={c.image} alt={c.title || ''} /><h2>{c.title}</h2><p>{c.text}</p></section>;
  if (block.type === 'hero') return <section className="cms-public cms-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.2)),url("${c.image}")` }}><div><h1>{c.title}</h1><p>{c.text}</p>{c.link && <a className="cms-button" href={c.link}>Découvrir</a>}</div></section>;
  if (block.type === 'button') return <section className="cms-public cms-center"><a className="cms-button" href={c.link || '#'}>{c.title || 'En savoir plus'}</a></section>;
  if (block.type === 'video') return <section className="cms-public"><h2>{c.title}</h2><video src={c.image} controls playsInline /><p>{c.text}</p></section>;
  if (block.type === 'gallery') return <section className="cms-public"><h2>{c.title}</h2><img src={c.image} alt={c.title || ''} /><p>{c.text}</p></section>;
  if (block.type === 'products') return <section className="cms-public"><h2>{c.title || 'Nos produits'}</h2><div className="cms-product-grid">{products.slice(0, 6).map(p => <article key={p.id}><img src={productImage(p)} alt={p.name} /><h3>{p.name}</h3><p>{money(p.price)}</p></article>)}</div></section>;
  if (block.type === 'categories') return <section className="cms-public"><h2>{c.title || 'Collections'}</h2><p>{Array.from(new Set(products.map(p => p.category))).join(' · ')}</p></section>;
  if (block.type === 'whatsapp') return <section className="cms-public cms-center"><h2>{c.title}</h2><p>{c.text}</p><a className="cms-button" href={`https://wa.me/${c.link}`}>Écrire sur WhatsApp</a></section>;
  if (block.type === 'contact') return <section className="cms-public"><h2>{c.title}</h2><p>{c.text}</p>{c.link && <a href={c.link}>{c.link}</a>}</section>;
  if (block.type === 'html') return <section className="cms-public"><iframe title={c.title || 'Bloc avancé'} className="cms-html" sandbox="allow-forms" srcDoc={c.html || ''} /></section>;
  return <section className="cms-public"><h2>{c.title}</h2><p>{c.text}</p></section>;
}

function CmsPageApp({ page }: { page: CmsPage }) {
  const [branding, setBranding] = useState<Branding | null>(null); const [pages, setPages] = useState<CmsPage[]>([]); const [products, setProducts] = useState<DatabaseProduct[]>([]);
  useEffect(() => { Promise.all([getBranding(), getPublicPages(), getProducts()]).then(([b, p, products]) => { setBranding(b); setPages(p); setProducts(products); }); }, [page.id]);
  useEffect(() => { if (branding?.favicon_url) { let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null; if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); } link.href = branding.favicon_url; document.title = page.seo_title || page.title; } }, [branding, page]);
  const brand = branding || { brand_name: 'ABAYA COLLECTIONS', logo_url: '/logo.png', colors: { accent: '#6f42c1', text: '#1d1d1d', background: '#f8f6f3' }, typography: { heading: 'Arial', body: 'Arial' }, footer: { tagline: '', text: '', whatsapp: '' } } as Branding;
  return <div className="app cms-site" style={{ '--accent': brand.colors.accent, '--cms-text': brand.colors.text, '--cms-bg': brand.colors.background, '--cms-heading': brand.typography.heading, '--cms-body': brand.typography.body } as React.CSSProperties}><header className="header"><a className="brand" href="/"><img src={brand.logo_url} alt={`Logo ${brand.brand_name}`} /><span>{brand.brand_name}</span></a><nav>{pages.map(p => <a key={p.id} href={p.is_home ? '/' : `/${p.slug}`}>{p.navigation_label}</a>)}</nav></header><main>{page.published.sections.filter(s => s.visible).map(section => <React.Fragment key={section.id}>{section.blocks.map(block => <CmsBlockView key={block.id} block={block} products={products} />)}</React.Fragment>)}</main><footer><div><strong>{brand.brand_name}</strong><p>{brand.footer.tagline}</p></div><div><a href={`https://wa.me/${brand.footer.whatsapp}`}>WhatsApp : +{brand.footer.whatsapp}</a><p>{brand.footer.text}</p></div></footer></div>;
}

function App() {
  const [products, setProducts] = useState<DatabaseProduct[]>([]);
  const [category, setCategory] = useState('Tous');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DatabaseProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [preview, setPreview] = useState<CartItem | null>(null);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const refresh = () => getProducts().then(setProducts).catch(() => setNotice('La boutique est momentanément indisponible.'));
  useEffect(() => { refresh(); getSiteSettings().then(setSettings); }, []);

  const categories = useMemo(() => ['Tous', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const visible = products.filter(p => (category === 'Tous' || p.category === category) && p.name.toLowerCase().includes(search.trim().toLowerCase()));
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  function add(product: DatabaseProduct, size: string) {
    if (product.stock < 1) return setNotice('Ce produit est épuisé.');
    setCart(current => {
      const found = current.find(item => item.id === product.id && item.size === size);
      const already = current.filter(item => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
      if (already >= product.stock) { setNotice('Vous avez atteint le stock disponible.'); return current; }
      return found ? current.map(item => key(item) === key(found) ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, size, quantity: 1 }];
    });
    setNotice(`${product.name} ajouté au panier.`);
  }

  function changeQuantity(item: CartItem, delta: number) {
    setCart(current => {
      const totalForProduct = current.filter(x => x.id === item.id).reduce((sum, x) => sum + x.quantity, 0);
      if (delta > 0 && totalForProduct >= item.stock) { setNotice('Stock maximum atteint.'); return current; }
      if (item.quantity + delta < 1) return current.filter(x => key(x) !== key(item));
      return current.map(x => key(x) === key(item) ? { ...x, quantity: x.quantity + delta } : x);
    });
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setNotice('Enregistrement de votre commande…');
    const form = new FormData(event.currentTarget);
    const customer = { name: String(form.get('name')), phone: String(form.get('phone')), address: String(form.get('address')) };
    try {
      const result = await createOrder(customer, cart.map(item => ({ product_id: item.id, size: item.size, quantity: item.quantity })));
      const details = cart.map(item => `- ${item.name} — Taille ${item.size} — Qté ${item.quantity} : ${money(item.price * item.quantity)}`).join('\n');
      const message = `Bonjour Abaya Collections, ma commande ${result.order_id.slice(0, 8).toUpperCase()} vient d'être enregistrée.\n\n${details}\n\nTotal : ${money(result.total)}\nClient : ${customer.name}\nTéléphone : ${customer.phone}\nAdresse : ${customer.address}`;
      setCart([]); setCheckout(false); setShowCart(false); await refresh();
      setNotice('Commande enregistrée ! WhatsApp va s’ouvrir pour la confirmation.');
      window.open(`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Commande impossible.'); }
    finally { setSending(false); }
  }

  return <div className="app" style={{ '--accent': settings.accent_color } as React.CSSProperties}>
    <header className="header"><div className="brand"><img src={settings.logo_url} alt={`Logo ${settings.brand_name}`} /><span>{settings.brand_name}</span></div><button className="menu-toggle" aria-label="Menu" onClick={() => setMenu(!menu)}>☰</button><nav className={menu ? 'nav-open' : ''}><a href="#accueil">Accueil</a><a href="#collections">Collections</a><a href="#services">Livraison</a><a href="#contact">Contact</a><button className="cart-menu-button" onClick={() => { setShowCart(true); setMenu(false); }}>🛒 Panier {count > 0 && <strong>{count}</strong>}</button></nav></header>
    {notice && <div className="site-notice" role="status">{notice}<button aria-label="Fermer" onClick={() => setNotice('')}>×</button></div>}
    <section className="hero" id="accueil" style={{ backgroundImage: `linear-gradient(90deg, rgba(15,15,15,.95), rgba(15,15,15,.55), rgba(15,15,15,.15)), url("${settings.hero_image_url}")` }}><div className="hero-content"><span className="small-title">{settings.hero_badge}</span><h1>{settings.hero_title.split('|').map((line, index) => <React.Fragment key={index}>{line}{index < settings.hero_title.split('|').length - 1 && <br />}</React.Fragment>)}</h1><p>{settings.hero_text}</p><button onClick={() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })}>{settings.hero_button}</button></div></section>
    <section className="shop-benefits"><div><span>✦</span><p><strong>{settings.benefit1_title}</strong><br />{settings.benefit1_text}</p></div><div><span>🚚</span><p><strong>{settings.benefit2_title}</strong><br />{settings.benefit2_text}</p></div><div><span>🔒</span><p><strong>{settings.benefit3_title}</strong><br />{settings.benefit3_text}</p></div></section>
    <section className="collections" id="collections"><div className="section-title"><span>{settings.catalogue_label}</span><h2>{settings.catalogue_title}</h2><p>{settings.catalogue_text}</p></div><div className="catalogue-tools"><label htmlFor="search">Rechercher une abaya</label><input id="search" type="search" placeholder="Ex. Élégance, Prestige…" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="category-buttons">{categories.map(value => <button key={value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{value}</button>)}</div><div className="products">{visible.map(product => <article className="product" key={product.id}><div className="product-image"><img src={productImage(product)} alt={product.name} /></div><div className="product-info"><h3>{product.name}</h3><p>{money(product.price)}</p><small className={product.stock < 1 ? 'out-stock' : ''}>{product.stock > 0 ? `${product.stock} en stock` : 'Épuisé'}</small><button onClick={() => { setSelected(product); setSelectedSize(product.sizes[0] || 'M'); }}>Voir le produit</button><button className="cart-add-button" disabled={product.stock < 1} onClick={() => add(product, product.sizes[0] || 'M')}>🛒 {product.stock > 0 ? 'Ajouter au panier' : 'Épuisé'}</button></div></article>)}</div>{visible.length === 0 && <p className="empty-catalogue">Aucune abaya ne correspond à votre recherche.</p>}</section>
    <section className="shopping-info" id="services"><div><span>01</span><h3>{settings.step1_title}</h3><p>{settings.step1_text}</p></div><div><span>02</span><h3>{settings.step2_title}</h3><p>{settings.step2_text}</p></div><div><span>03</span><h3>{settings.step3_title}</h3><p>{settings.step3_text}</p></div></section>
    <footer id="contact"><div><strong>{settings.brand_name}</strong><p>{settings.footer_tagline}</p></div><div><h3>Service clientèle</h3><a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noreferrer">WhatsApp : +{settings.whatsapp_number}</a></div><div><h3>Informations</h3><p>{settings.footer_text}</p></div></footer>

    {selected && <div className="modal" role="dialog" aria-modal="true"><div className="modal-content product-detail"><button className="close" onClick={() => setSelected(null)}>×</button><img src={productImage(selected)} alt={selected.name} />{selected.video_url && <video className="product-video" src={selected.video_url} controls playsInline preload="metadata">Votre navigateur ne peut pas lire cette vidéo.</video>}<h2>{selected.name}</h2><p className="description">{selected.description}</p><p>{money(selected.price)}</p><p className={selected.stock < 1 ? 'out-stock' : 'in-stock'}>{selected.stock > 0 ? `${selected.stock} article(s) disponible(s)` : 'Produit épuisé'}</p><div className="size-selector"><h4>Choisir la taille</h4><div className="size-buttons">{selected.sizes.map(size => <button key={size} className={selectedSize === size ? 'size-active' : ''} onClick={() => setSelectedSize(size)}>{size}</button>)}</div></div><button className="buy-now-button" disabled={selected.stock < 1} onClick={() => { add(selected, selectedSize); setSelected(null); setShowCart(true); }}>Ajouter au panier</button></div></div>}

    {showCart && <div className="cart-modal" role="dialog" aria-modal="true"><div className="cart-content"><button className="close" onClick={() => { setShowCart(false); setCheckout(false); }}>×</button><h2>Mon panier</h2>{cart.length === 0 ? <p>Votre panier est vide.</p> : <>{cart.map(item => <div className="cart-item" key={key(item)}><button className="cart-image-button" aria-label={`Agrandir ${item.name}`} onClick={() => setPreview(item)}><img src={productImage(item)} alt={item.name} /></button><div><h3>{item.name}</h3><button className="view-cart-product" onClick={() => setPreview(item)}>Voir le produit</button><p>Taille : {item.size}</p><p>{money(item.price * item.quantity)}</p><div className="quantity"><button onClick={() => changeQuantity(item, -1)}>−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item, 1)}>+</button></div><button className="remove-button" onClick={() => setCart(c => c.filter(x => key(x) !== key(item)))}>Supprimer</button></div></div>)}<h3 className="cart-total">Total : {money(total)}</h3>{!checkout ? <button className="order-button" onClick={() => setCheckout(true)}>Continuer la commande</button> : <form className="checkout-form" onSubmit={submitOrder}><h3>Vos informations</h3><label>Nom complet<input name="name" required minLength={2} /></label><label>Téléphone<input name="phone" type="tel" required minLength={6} /></label><label>Adresse de livraison<textarea name="address" required minLength={3} /></label><button className="order-button" disabled={sending}>{sending ? 'Enregistrement…' : 'Enregistrer et confirmer sur WhatsApp'}</button></form>}</>}</div></div>}
    {preview && <div className="modal image-preview-modal" role="dialog" aria-modal="true"><div className="modal-content image-preview-content"><button className="close" onClick={() => setPreview(null)}>×</button><img src={productImage(preview)} alt={preview.name} /><h2>{preview.name}</h2><p>{money(preview.price)}</p><button className="buy-now-button" onClick={() => setPreview(null)}>Retour au panier</button></div></div>}
  </div>;
}

function Router() {
  const [page, setPage] = useState<CmsPage | null | undefined>(undefined);
  const path = window.location.pathname;
  const slug = path === '/' ? 'accueil' : path.replace(/^\//, '').split('/')[0];
  useEffect(() => { if (!path.startsWith('/admin')) getPublicPage(slug).then(setPage).catch(() => setPage(null)); }, [slug, path]);
  if (path.startsWith('/admin')) return <Admin />;
  // Keep the original storefront, catalogue and checkout as the permanent
  // homepage. The no-code CMS remains available for additional pages.
  if (path === '/') return <App />;
  if (page === undefined) return <App />;
  return page ? <CmsPageApp page={page} /> : <App />;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Router /></React.StrictMode>);
