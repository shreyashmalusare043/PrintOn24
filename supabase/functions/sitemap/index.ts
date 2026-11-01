import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const siteUrl = 'https://printon24.in';
const slug = (name: string) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

Deno.serve(async request => {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const [{ data, error }, { data: careers, error: careersError }] = await Promise.all([
    supabase.from('print_shops').select('name,city').eq('status', 'active').eq('is_online', true).order('name'),
    supabase.from('careers').select('title').eq('is_active', true).order('title')
  ]);
  if (error) return new Response('Unable to generate sitemap', { status: 500 });
  const urls = [`<url><loc>${siteUrl}/</loc><priority>1.0</priority></url>`, `<url><loc>${siteUrl}/upload</loc><priority>0.9</priority></url>`, `<url><loc>${siteUrl}/scan</loc><priority>0.8</priority></url>`, `<url><loc>${siteUrl}/about</loc><priority>0.7</priority></url>`, `<url><loc>${siteUrl}/careers</loc><priority>0.7</priority></url>`, `<url><loc>${siteUrl}/advertise</loc><priority>0.6</priority></url>`, `<url><loc>${siteUrl}/contact</loc><priority>0.7</priority></url>`, `<url><loc>${siteUrl}/feedback</loc><priority>0.4</priority></url>`, `<url><loc>${siteUrl}/features/profile-and-membership</loc><priority>0.6</priority></url>`, `<url><loc>${siteUrl}/how-it-works</loc><priority>0.9</priority></url>`, `<url><loc>${siteUrl}/features/print-reports</loc><priority>0.6</priority></url>`, `<url><loc>${siteUrl}/privacy-policy</loc><priority>0.5</priority></url>`, `<url><loc>${siteUrl}/terms-and-conditions</loc><priority>0.5</priority></url>`, `<url><loc>${siteUrl}/help/settings-and-preferences</loc><priority>0.4</priority></url>`, ...(careersError ? [] : (careers || []).map(role => `<url><loc>${siteUrl}/careers/${slug(String(role.title))}</loc></url>`)), ...(data || []).map(shop => {
    const loc = `${siteUrl}/shops/${encodeURIComponent(String(shop.city || 'Pune').toLowerCase())}/${slug(String(shop.name))}`;
    return `<url><loc>${escapeXml(loc)}</loc></url>`;
  })];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
});
