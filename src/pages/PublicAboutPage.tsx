import { useEffect, useState } from 'react';
import { fetchPublicPrintShops, shopSlug, type PublicPrintShop } from '../services/api';
import { aboutCustomerSteps, aboutFaqs, aboutFeatures, aboutMission, aboutShopSteps, aboutTeam, aboutVision } from '../content/aboutUsContent';

const siteUrl = 'https://printon24.in';
const aboutUrl = `${siteUrl}/about`;
const aboutDescription = 'printOn24 connects students and professionals with local print shops. Scan a shop QR, upload files, pay and collect. Meet our mission, vision and team in Pune.';

const setMeta = (selector: string, attributes: Record<string, string>, content: string) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const aboutSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#org`,
      name: 'printOn24',
      legalName: 'printOn24 Technology Pvt. Ltd.',
      url: siteUrl,
      logo: `${siteUrl}/icons/printon24-512.png`,
      description: 'Indian online printing platform that connects customers with local print and xerox shops.',
      email: 'info@hrsactech.in',
      telephone: '+91-9284289782',
      slogan: 'Revolutionizing Daily Printing Through Intelligent Technology',
      address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'Maharashtra', addressCountry: 'IN' },
      areaServed: { '@type': 'City', name: 'Pune' },
      knowsAbout: ['online document printing', 'print shop automation', 'QR code printing workflow', 'print queue management']
    },
    {
      '@type': 'AboutPage',
      '@id': `${aboutUrl}#page`,
      url: aboutUrl,
      name: 'About printOn24',
      description: aboutDescription,
      isPartOf: { '@id': `${siteUrl}/#website` },
      about: { '@id': `${siteUrl}/#org` },
      inLanguage: 'en-IN'
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'About', item: aboutUrl }
      ]
    },
    {
      '@type': 'FAQPage',
      mainEntity: aboutFaqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }))
    }
  ]
};

export function PublicAboutPage() {
  const [shops, setShops] = useState<PublicPrintShop[]>([]);

  useEffect(() => {
    document.title = 'About printOn24 - Online Printing Platform for Local Print Shops';
    setMeta('meta[name="description"]', { name: 'description' }, aboutDescription);
    setMeta('meta[name="author"]', { name: 'author' }, 'printOn24 Technology Pvt. Ltd.');
    setMeta('meta[name="keywords"]', { name: 'keywords' }, 'about printOn24, online printing platform, online document printing service India, print shop automation software, digital print shop platform, printOn24 Pune');
    setMeta('meta[name="robots"]', { name: 'robots' }, 'index, follow, max-image-preview:large, max-snippet:-1');
    setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'printOn24');
    setMeta('meta[property="og:title"]', { property: 'og:title' }, 'About printOn24 - Our Story, Mission and Team');
    setMeta('meta[property="og:description"]', { property: 'og:description' }, 'An online printing platform from Pune that turns neighbourhood print shops into digital service hubs.');
    setMeta('meta[property="og:url"]', { property: 'og:url' }, aboutUrl);
    setMeta('meta[property="og:image"]', { property: 'og:image' }, `${siteUrl}/icons/printon24-512.png`);
    setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, 'About printOn24 online printing platform');
    setMeta('meta[property="og:image:width"]', { property: 'og:image:width' }, '512');
    setMeta('meta[property="og:image:height"]', { property: 'og:image:height' }, '512');
    setMeta('meta[property="og:locale"]', { property: 'og:locale' }, 'en_IN');
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, 'About printOn24 - Our Story, Mission and Team');
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, 'Online printing from Pune: scan, upload, pay and collect at local print shops.');
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, `${siteUrl}/icons/printon24-512.png`);
    setMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt' }, 'About printOn24 online printing platform');
    setMeta('meta[name="theme-color"]', { name: 'theme-color' }, '#FF1200');
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', aboutUrl);
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach(script => script.remove());
    const schemaScript = document.createElement('script');
    schemaScript.id = 'about-page-jsonld';
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(aboutSchema);
    document.head.appendChild(schemaScript);

    let mounted = true;
    fetchPublicPrintShops()
      .then(data => mounted && setShops(data))
      .catch(error => console.error('Unable to load public About shop links:', error));
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8">
        <article className="mx-auto max-w-6xl">
          <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-4xl">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF1300]">About printOn24 · Pune, Maharashtra</p>
                <h1 className="mt-3 text-3xl font-black leading-tight font-heading md:text-5xl">About printOn24: Online Printing That Connects You with Local Print Shops</h1>
                <p className="mt-4 text-base font-bold text-slate-700">Revolutionizing Daily Printing Through Intelligent Technology</p>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">printOn24 is an online printing platform from Pune. Customers upload documents, choose available print options and collect completed prints from a connected local print shop.</p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                  <a className="rounded-full bg-[#FF1300] px-5 py-3 text-white" href="/shops">Find a Print Shop</a>
                  <a className="rounded-full border border-red-200 px-5 py-3 text-[#FF1300]" href="mailto:info@hrsactech.in?subject=Partner%20with%20printOn24">Partner with us</a>
                </div>
              </div>
              <img src="/icons/printon24-512.png" alt="printOn24 online printing platform logo" width="160" height="160" className="h-32 w-32 rounded-3xl border border-slate-200 object-contain p-3 md:h-40 md:w-40" />
            </div>
          </header>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 md:col-span-2" id="story">
              <h2 className="text-2xl font-black font-heading">Our Story</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">printOn24 was created to address common document-printing problems: long queues, file-formatting issues on shop computers, chat-app or pen-drive file sharing and manual order communication. The platform moves document preparation and print choices into an online workflow, while connected shops receive the order through their shopkeeper workflow.</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">printOn24 is built in Pune, Maharashtra, with High Resolution Software and Coding as the technology partner. The service is based in Pune and expanding through eligible connected partner shops.</p>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white" aria-label="Facts about printOn24">
              <h2 className="text-xl font-black font-heading">Facts about printOn24</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="font-bold text-red-300">Business</dt><dd>printOn24 Technology Pvt. Ltd.</dd></div>
                <div><dt className="font-bold text-red-300">Category</dt><dd>Online document printing platform</dd></div>
                <div><dt className="font-bold text-red-300">Based in</dt><dd>Pune, Maharashtra, India</dd></div>
                <div><dt className="font-bold text-red-300">Contact</dt><dd>info@hrsactech.in · +91 9284289782</dd></div>
              </dl>
            </section>
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8" id="what-is-printon24">
            <h2 className="text-2xl font-black font-heading">What is printOn24?</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">printOn24 is an online printing platform from Pune that connects customers with local print shops. Customers scan a shop QR code or open a shop link, upload a supported document, choose available print settings, see the shop’s price before ordering, pay through the available option and collect the print with a pickup token. Print shops receive the order through a connected counter workflow.</p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div><h3 className="text-lg font-black font-heading">How it works for customers</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">{aboutCustomerSteps.map(step => <li key={step}>{step}</li>)}</ol></div>
              <div><h3 className="text-lg font-black font-heading">How it works for print shops</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">{aboutShopSteps.map(step => <li key={step}>{step}</li>)}</ol></div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8" id="features">
            <h2 className="text-2xl font-black font-heading">What Makes printOn24 Different</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3 font-bold">Feature</th><th className="p-3 font-bold">How it helps</th></tr></thead><tbody>{aboutFeatures.map(([feature, description]) => <tr className="border-t" key={feature}><th className="p-3 align-top font-bold">{feature}</th><td className="p-3 text-slate-700">{description}</td></tr>)}</tbody></table></div>
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-2" id="mission">
            <div className="rounded-3xl border border-red-100 bg-white p-6"><h2 className="text-2xl font-black font-heading">Our Mission</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{aboutMission.map(item => <li key={item}>{item}</li>)}</ul></div>
            <div className="rounded-3xl border border-blue-100 bg-white p-6" id="vision"><h2 className="text-2xl font-black font-heading">Our Vision</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{aboutVision.map(item => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8" id="benefits">
            <h2 className="text-2xl font-black font-heading">Benefits at a Glance</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-5"><h3 className="font-black font-heading">For customers</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700"><li>Send a print job before reaching the shop.</li><li>Review page range and available print options online.</li><li>Avoid sharing an unlocked phone or document through public chat.</li><li>Collect using a pickup token and access the available receipt.</li></ul></div><div className="rounded-2xl bg-slate-50 p-5"><h3 className="font-black font-heading">For print shop owners</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700"><li>Receive connected customer orders in the shopkeeper workflow.</li><li>Use shop code and QR-based discovery for customers.</li><li>Manage queue and account activity in the available panel.</li><li>Support printer dispatch where the workstation agent is configured.</li></ul></div></div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8" id="team">
            <h2 className="text-2xl font-black font-heading">Team and Credits</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">printOn24 is operated by printOn24 Technology Pvt. Ltd. The engineering and core team and the technology partner are listed below using the current project information.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{aboutTeam.map(([name, role]) => <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={name}><h3 className="font-black font-heading">{name}</h3><p className="mt-1 text-sm text-slate-600">{role}</p></div>)}</div>
            <a className="mt-5 flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4" href="https://hrsactech.in/" target="_blank" rel="noopener noreferrer"><img src="https://miaoda-conversation-file.s3cdn.medo.dev/user-awm3lxjnyu4g/app-epyrkfdiozk1/20261013/HR-SAC.png" alt="High Resolution Software and Coding logo, technology partner of printOn24" width="64" height="64" className="h-16 w-16 rounded-xl bg-white object-contain p-1" /><span><strong className="block">High Resolution Software and Coding</strong><span className="text-sm text-slate-600">Technology partner in Pune, Maharashtra</span></span></a>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8" id="trust">
            <h2 className="text-2xl font-black font-heading">Trust, Privacy and Security</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">Uploaded documents are stored in encrypted cloud storage and automatically deleted within 12 hours. printOn24 does not require customers to hand over an unlocked phone or share files through public chat apps. See the <a className="font-bold text-[#FF1300] underline" href="/privacy-policy">Privacy Policy</a> and <a className="font-bold text-[#FF1300] underline" href="/terms-and-conditions">Terms and Conditions</a> for the current rules.</p>
          </section>

          <section className="hidden md:block mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8" id="faq">
            <h2 className="text-2xl font-black font-heading">About Us FAQs</h2>
            <div className="mt-4 grid gap-4">{aboutFaqs.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold marker:content-none"><span>{question}</span><span className="text-lg text-[#FF1300] transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-700">{answer}</p></details>)}</div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8"><h2 className="text-2xl font-black font-heading">Connected Partner Print Shops</h2><p className="mt-3 text-sm text-slate-600">Active, online and connected partner shops are loaded from PrintOn24 data. Only eligible shops are linked below.</p>{shops.length > 0 ? <div className="mt-4 grid gap-3 md:grid-cols-2">{shops.map(shop => <div className="rounded-2xl border border-slate-200 p-4" key={shop.id}><h3 className="font-bold">{shop.name}</h3><p className="mt-1 text-sm text-slate-500">{shop.address || shop.city}</p><a className="mt-3 inline-block text-sm font-bold text-[#FF1300] underline" href={`/shops/${shop.city.toLowerCase()}/${shopSlug(shop.name)}`}>View print shop</a></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No eligible connected partner shops are available right now.</p>}</section>

          <nav className="mt-6 flex flex-wrap gap-4 text-sm font-bold"><a className="text-[#FF1300] underline" href="/">printOn24 Home</a><a className="text-[#FF1300] underline" href="/upload">Upload and print</a><a className="text-[#FF1300] underline" href="/scan">Scan a shop QR code</a><a className="text-[#FF1300] underline" href="/shops">Find print shops</a><a className="text-[#FF1300] underline" href="/features/print-reports">Print reports</a><a className="text-[#FF1300] underline" href="mailto:info@hrsactech.in">Contact support</a></nav>
          <p className="mt-4 text-xs text-slate-500">Last updated: 1 November 2026 · Service area: Pune, Maharashtra, expanding through connected partner shops.</p>
        </article>
      </main>
    </>
  );
}

export default PublicAboutPage;
