import { useEffect, useState } from 'react';
import PageMeta from '../components/common/PageMeta';
import { fetchPublicPrintShopBySlug, type PublicPrintShop, shopSlug } from '../services/api';

const siteUrl = 'https://printon24.in';

function shopUrl(shop: PublicPrintShop) {
  return `${siteUrl}/shops/${shop.city.toLowerCase()}/${shopSlug(shop.name)}`;
}

function qrUrl(shop: PublicPrintShop) {
  const target = shop.qrCodeData || `${siteUrl}/upload?shop=${encodeURIComponent(shop.shopCode)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(target)}`;
}

export function PublicVendorPage({ slug }: { slug: string }) {
  const [shop, setShop] = useState<PublicPrintShop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPublicPrintShopBySlug(slug)
      .then(value => mounted && setShop(value))
      .catch(error => console.error('Unable to load public print shop:', error))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug]);

  if (loading) {
    return <main className="min-h-screen bg-white p-8 text-slate-700">Loading print shop details…</main>;
  }

  if (!shop) {
    return (
      <>
        <PageMeta title="Print shop not found | printOn24" robots="noindex, nofollow" />
        <main className="min-h-screen bg-white p-8 text-slate-700">
          <h1 className="text-2xl font-bold">Print shop not found</h1>
          <p className="mt-2">This partner print shop is not currently available on printOn24.</p>
          <a className="mt-4 inline-block text-red-600 underline" href="/">Return to printOn24</a>
        </main>
      </>
    );
  }

  const url = shopUrl(shop);
  const description = `Upload your file online and print at ${shop.name}, ${shop.city}. Services, shop code and pickup are available through printOn24.`;
  const vendorSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${url}#business`,
        name: shop.name,
        url,
        telephone: shop.phone || undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: shop.address,
          addressLocality: shop.city,
          addressRegion: 'Maharashtra',
          addressCountry: 'IN'
        },
        geo: shop.latitude != null && shop.longitude != null ? {
          '@type': 'GeoCoordinates', latitude: shop.latitude, longitude: shop.longitude
        } : undefined,
        parentOrganization: { '@id': `${siteUrl}/#org` },
        knowsAbout: shop.services
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: `${shop.name} - Online Printing in ${shop.city}`,
        description,
        about: { '@id': `${url}#business` },
        isPartOf: { '@id': `${siteUrl}/#website` }
      }
    ]
  };

  return (
    <>
      <PageMeta
        title={`${shop.name} - Print and Xerox in ${shop.city} | printOn24`}
        description={description}
        robots="index, follow, max-image-preview:large, max-snippet:-1"
        canonical={url}
        ogTitle={`${shop.name} - Online Printing in ${shop.city}`}
        ogDescription={description}
        ogUrl={url}
        ogImage={shop.bannerUrl || shop.logoUrl || `${siteUrl}/icons/printon24-512.png`}
        twitterTitle={`${shop.name} - Online Printing in ${shop.city}`}
        twitterDescription={description}
        twitterImage={shop.bannerUrl || shop.logoUrl || `${siteUrl}/icons/printon24-512.png`}
        twitterCard="summary_large_image"
        jsonLd={vendorSchema}
      />
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <article className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm md:p-10">
          <p className="text-sm font-bold text-red-600">Verified printOn24 partner print shop</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">{shop.name} - Online Printing in {shop.city}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">Upload your document to printOn24, choose this partner print shop, and collect the printout with a pickup token.</p>

          <div className="mt-8 grid gap-8 md:grid-cols-[1fr_220px]">
            <div>
              <h2 className="text-xl font-bold">Print services and shop details</h2>
              <p className="mt-3 text-slate-700">Address: {shop.address}{shop.landmark ? ` (${shop.landmark})` : ''}</p>
              {shop.phone && <p className="mt-2 text-slate-700">Phone: {shop.phone}</p>}
              <p className="mt-2 text-slate-700">Shop code: <strong>{shop.shopCode}</strong></p>
              <h3 className="mt-6 text-lg font-bold">Available services</h3>
              {shop.services.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{shop.services.map(service => <li key={service}>{service}</li>)}</ul> : <p className="mt-2 text-slate-600">Services are managed by this partner shop.</p>}
              <h3 className="mt-6 text-lg font-bold">How do I order from this print shop?</h3>
              <p className="mt-2 text-slate-700">Select Upload and Print, upload your file, choose the available print settings, and place your order. The upload page opens with {shop.name} preselected.</p>
              <a href={`/upload?shop=${encodeURIComponent(shop.shopCode)}`} className="mt-6 inline-flex rounded-full bg-red-600 px-6 py-3 font-bold text-white">Order now</a>
            </div>
            <div className="text-center">
              <img src={qrUrl(shop)} alt={`${shop.name} print shop QR code`} width="220" height="220" className="mx-auto rounded-xl border p-2" />
              <p className="mt-2 text-xs text-slate-500">Scan to open this shop in printOn24</p>
            </div>
          </div>
          <nav className="mt-10 border-t pt-6 text-sm"><a className="text-red-600 underline" href="/shops">All partner print shops</a> · <a className="text-red-600 underline" href="/">printOn24 Home</a></nav>
        </article>
      </main>
    </>
  );
}
