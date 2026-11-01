import { useEffect } from 'react';
import { privacyPolicyContent } from '../content/privacyTermsSettingsContent';

const siteUrl = 'https://printon24.in';
const pageUrl = `${siteUrl}/privacy-policy`;

function meta(selector: string, attrs: Record<string, string>, content: string) {
  let node = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!node) { node = document.createElement('meta'); Object.entries(attrs).forEach(([key, value]) => node?.setAttribute(key, value)); document.head.appendChild(node); }
  node.setAttribute('content', content);
}

function installPageMeta() {
  document.title = 'Privacy Policy and Data Protection - 12-Hour Document Lifecycle | printOn24';
  meta('meta[name="description"]', { name: 'description' }, privacyPolicyContent.description);
  meta('meta[name="keywords"]', { name: 'keywords' }, 'printOn24 privacy policy, document privacy, 12 hour document deletion, online printing data protection, PayU payment privacy, print shop privacy');
  meta('meta[name="author"]', { name: 'author' }, 'printOn24');
  meta('meta[name="robots"]', { name: 'robots' }, 'index, follow, max-image-preview:large, max-snippet:-1');
  meta('meta[property="og:type"]', { property: 'og:type' }, 'website'); meta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'printOn24');
  meta('meta[property="og:title"]', { property: 'og:title' }, document.title); meta('meta[property="og:description"]', { property: 'og:description' }, privacyPolicyContent.description); meta('meta[property="og:url"]', { property: 'og:url' }, pageUrl); meta('meta[property="og:image"]', { property: 'og:image' }, `${siteUrl}/icons/printon24-512.png`); meta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, 'printOn24 privacy and data protection');
  meta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image'); meta('meta[name="twitter:title"]', { name: 'twitter:title' }, document.title); meta('meta[name="twitter:description"]', { name: 'twitter:description' }, privacyPolicyContent.description); meta('meta[name="twitter:image"]', { name: 'twitter:image' }, `${siteUrl}/icons/printon24-512.png`);
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null; if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); } canonical.href = pageUrl;
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach(script => script.remove());
  const script = document.createElement('script'); script.id = 'privacy-policy-jsonld'; script.type = 'application/ld+json'; script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', '@id': `${pageUrl}#page`, url: pageUrl, name: document.title, description: privacyPolicyContent.description, dateModified: '2026-11-01', inLanguage: 'en-IN' }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` }, { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: pageUrl }] }] }); document.head.appendChild(script);
}

export function PublicPrivacyPolicyPage({ redirectFromLegacy = false }: { redirectFromLegacy?: boolean }) {
  useEffect(() => { if (redirectFromLegacy) window.history.replaceState({}, '', pageUrl); installPageMeta(); }, [redirectFromLegacy]);
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8"><article className="mx-auto max-w-6xl"><header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF1300]">Your Documents. Your Privacy. Our Responsibility.</p><h1 className="mt-3 text-3xl font-black leading-tight font-heading md:text-5xl">{privacyPolicyContent.title}</h1><p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">{privacyPolicyContent.description}</p><p className="mt-3 text-sm text-slate-500">Last updated: 1 November 2026</p></header><nav aria-label="Privacy policy sections" className="mt-6 rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-black font-heading">Privacy Policy at a Glance</h2><div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">{privacyPolicyContent.sections.slice(0, 5).map(([heading]) => <a className="text-[#FF1300] underline" href={`#${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} key={heading}>{heading}</a>)}</div></nav>{privacyPolicyContent.sections.map(([heading, paragraphs]) => <section id={heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8" key={heading}><h2 className="text-2xl font-black font-heading">{heading}</h2>{paragraphs.map(paragraph => <p className="mt-3 text-sm leading-7 text-slate-700" key={paragraph}>{paragraph}</p>)}{heading.includes('Deletion Requests') && <a className="mt-3 inline-block font-bold text-[#FF1300] underline" href="mailto:info@hrsactech.in?subject=Privacy%20request">Email a privacy request</a>}</section>)}<nav className="mt-6 flex flex-wrap gap-4 text-sm font-bold"><a className="text-[#FF1300] underline" href="/terms-and-conditions">Terms and Conditions</a><a className="text-[#FF1300] underline" href="/help/settings-and-preferences">Settings and Preferences Guide</a><a className="text-[#FF1300] underline" href="/contact">Contact support</a><a className="text-[#FF1300] underline" href="/upload">Upload and print</a></nav></article></main>;
}
