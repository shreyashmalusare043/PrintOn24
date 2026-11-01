import React, { useEffect, useState } from 'react';
import { fetchPublicPrintShops, shopSlug, type PublicPrintShop } from '../services/api';

const reportFaqs = [
  ['What does the printOn24 report show?', 'It shows Total Prints in pages, Total Spent, Download Logs, Avg. Order Value and a monthly Printing Activity Overview.'],
  ['Where can I find my report?', 'Open the Report tab in the printOn24 app to view your Personal Report and Analytics.'],
  ['Is the report only about my own prints?', 'Yes. The report is personal to your account and shows your own processed printing activity and spending.'],
  ['What does Total Prints mean?', 'Total Prints is the number of pages printed in the selected period.'],
  ['What does Total Spent mean?', 'Total Spent is the amount from your processed print orders in the selected period.'],
  ['What are Download Logs?', 'Download Logs count files you downloaded, such as digital receipts, in the report period.'],
  ['What is Avg. Order Value?', 'Avg. Order Value is your total spent divided by the number of processed orders in the selected period.'],
  ['How do I change the time period?', 'Use the period filter, such as Last 30 Days, to change the range used by the summary cards.'],
  ['How do I see a different month?', 'Use the arrows beside the month name in Printing Activity Overview to move to the previous or next month.'],
  ['What are the print categories?', 'Prints are grouped as Documents, Color Prints, Photos and Assignments in the chart legend.'],
  ['What does the chart tooltip show?', 'Tapping a chart point shows the file name, category, date, pages and cost for that print.'],
  ['Why is my report empty?', 'The report fills after a print order is processed. If there are no processed orders in the selected period, it shows no activity.'],
  ['Can I see colour and black and white pages?', 'Yes. Printing Activity Overview shows the colour and B&W page counts for the selected month.'],
  ['Are my documents stored in the report?', 'No. The report uses order details, while uploaded documents are automatically deleted within 12 hours.'],
  ['Who can see my printOn24 report?', 'The report is personal to your account and is not a public shop report.']
];

const reportSteps = [
  'Open printOn24 and tap Report in the app navigation.',
  'Choose a period such as Last 30 Days.',
  'Read Total Prints, Total Spent, Download Logs and Avg. Order Value.',
  'Use the month selector in Printing Activity Overview.',
  'Tap a chart point to see file, category, date, pages and cost.'
];

const reportSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://printon24.in/features/print-reports#page',
      url: 'https://printon24.in/features/print-reports',
      name: 'Print Report and Spending Tracker | printOn24',
      description: 'See pages printed, printing spend, downloads and average order value with printOn24 Personal Report and Analytics.',
      inLanguage: 'en-IN',
      isPartOf: { '@id': 'https://printon24.in/#website' },
      publisher: { '@id': 'https://printon24.in/#org' }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://printon24.in/' },
        { '@type': 'ListItem', position: 2, name: 'Features', item: 'https://printon24.in/features' },
        { '@type': 'ListItem', position: 3, name: 'Print Reports', item: 'https://printon24.in/features/print-reports' }
      ]
    },
    {
      '@type': 'HowTo',
      name: 'How to view your printOn24 print report',
      step: reportSteps.map(name => ({ '@type': 'HowToStep', name }))
    },
    {
      '@type': 'WebApplication',
      name: 'printOn24 Print Report',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, iOS',
      featureList: ['Total prints', 'Total spent', 'Download logs', 'Average order value', 'Last 30 days filter', 'Monthly activity chart', 'Category and colour breakdown'],
      publisher: { '@id': 'https://printon24.in/#org' }
    },
    {
      '@type': 'FAQPage',
      mainEntity: reportFaqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }))
    }
  ]
};

const setMeta = (selector: string, attributes: Record<string, string>, content: string) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

export const PublicPrintReportsPage: React.FC = () => {
  const [shops, setShops] = useState<PublicPrintShop[]>([]);

  useEffect(() => {
    document.title = 'Print Report and Spending Tracker - Pages, Cost, Orders | printOn24';
    setMeta('meta[name="description"]', { name: 'description' }, 'See how many pages you printed, how much you spent and your average order value. printOn24 reports show monthly trends by document, colour, photo and assignment.');
    setMeta('meta[name="author"]', { name: 'author' }, 'printOn24');
    setMeta('meta[name="robots"]', { name: 'robots' }, 'index, follow, max-image-preview:large, max-snippet:-1');
    setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'printOn24');
    setMeta('meta[property="og:title"]', { property: 'og:title' }, 'Track Your Printing Activity and Spending | printOn24');
    setMeta('meta[property="og:description"]', { property: 'og:description' }, 'Total prints, total spent, downloads and average order value, with a monthly chart.');
    setMeta('meta[property="og:url"]', { property: 'og:url' }, 'https://printon24.in/features/print-reports');
    setMeta('meta[property="og:image"]', { property: 'og:image' }, 'https://printon24.in/icons/printon24-512.png');
    setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, 'printOn24 print report with example data');
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, 'Track Your Printing Activity and Spending | printOn24');
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, 'See pages printed, money spent and average order value on printOn24.');
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, 'https://printon24.in/icons/printon24-512.png');
    setMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt' }, 'printOn24 print report with example data');

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://printon24.in/features/print-reports');

    document.head.querySelector('#print-reports-page-jsonld')?.remove();
    const schemaScript = document.createElement('script');
    schemaScript.id = 'print-reports-page-jsonld';
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(reportSchema);
    document.head.appendChild(schemaScript);

    let mounted = true;
    fetchPublicPrintShops().then(data => mounted && setShops(data)).catch(error => console.error('Unable to load public report shop links:', error));
    return () => { mounted = false; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF1300]">printOn24 Print Reports</p>
          <h1 className="mt-2 text-3xl font-black font-heading md:text-5xl">Track Your Printing Activity, Spending and Orders</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">The printOn24 Personal Report and Analytics feature shows your total pages, printing expenses, downloads, average order value and monthly activity. The public examples below are illustrative only and never use real customer data.</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold"><a className="rounded-full bg-[#FF1300] px-4 py-2 text-white" href="/app/report">Open My Report</a><a className="rounded-full border border-red-200 px-4 py-2 text-[#FF1300]" href="/upload">Learn How to Print</a></div>
        </section>

        <div className="hidden md:block">
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-2xl font-black font-heading">What is the printOn24 Report?</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">The printOn24 Report is a personal dashboard inside the app. It turns your processed print orders into simple totals and a monthly chart, helping you understand your print history and plan a printing budget. The report belongs to your account and is not a public shop report.</p>
        </section>

        <section id="summary-cards" className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-2xl font-black font-heading">Your Print Report at a Glance</h2>
          <p className="mt-3 text-sm text-slate-600">These clearly labelled example values explain what each report card means. They are not real user data.</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3 font-bold">Card</th><th className="p-3 font-bold">What it shows</th><th className="p-3 font-bold">Example data only</th></tr></thead><tbody className="text-slate-700"><tr className="border-t"><td className="p-3 font-bold">Total Prints</td><td className="p-3">Pages printed in the selected period</td><td className="p-3">5 pages</td></tr><tr className="border-t"><td className="p-3 font-bold">Total Spent</td><td className="p-3">Amount spent on processed orders</td><td className="p-3">Rs 25.00 from 1 order</td></tr><tr className="border-t"><td className="p-3 font-bold">Download Logs</td><td className="p-3">Files downloaded, such as receipts</td><td className="p-3">1 file</td></tr><tr className="border-t"><td className="p-3 font-bold">Avg. Order Value</td><td className="p-3">Total spent divided by orders</td><td className="p-3">Rs 25.00</td></tr></tbody></table></div>
        </section>

        <section id="period" className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-2xl font-black font-heading">Choose the Time Period</h2><p className="mt-3 text-sm leading-7 text-slate-700">The period filter starts at Last 30 Days and changes the range used by the four summary cards. In Printing Activity Overview, use the arrows beside the month name to move to another month.</p></div>
          <div id="activity-chart" className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-2xl font-black font-heading">Printing Activity Overview</h2><p className="mt-3 text-sm leading-7 text-slate-700">The monthly chart shows print orders by date. A point can provide the file name, category, date, pages and cost. Colour and B&W page counts summarize the selected month.</p></div>
        </section>

        <section id="categories" className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8"><h2 className="text-2xl font-black font-heading">Print Categories and Cost Tracking</h2><p className="mt-3 text-sm leading-7 text-slate-700">Print Categories include Documents, Color Prints, Photos and Assignments. The legend names each category so the chart is understandable without relying on colour alone. Compare colour and black and white pages, review the most expensive files, and use Back to Back or 2-in-1 layouts where they suit the document.</p></section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8"><h2 className="text-2xl font-black font-heading">How to View Your Report</h2><ol className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">{reportSteps.map((step, index) => <li key={step} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><strong>Step {index + 1}</strong><span className="mt-2 block">{step}</span></li>)}</ol></section>

        <section id="privacy" className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8"><h2 className="text-2xl font-black font-heading">Your Report Data and Privacy</h2><p className="mt-3 text-sm leading-7 text-slate-700">The report uses your processed order data. It is personal to your account, while uploaded documents are automatically deleted within 12 hours. Do not publish report screenshots containing real names, file names, amounts or order details.</p><p className="mt-3 text-sm text-slate-600"><a className="font-bold text-[#FF1300] underline" href="/privacy-policy">Read the Privacy Policy</a> for privacy information.</p></section>

        <section id="faq" className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8"><h2 className="text-2xl font-black font-heading">Report FAQs</h2><div className="mt-4 grid gap-4">{reportFaqs.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold marker:content-none"><span>{question}</span><span className="text-lg text-[#FF1300] transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-700">{answer}</p></details>)}</div></section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8"><h2 className="text-2xl font-black font-heading">Active Partner Print Shops</h2><p className="mt-3 text-sm text-slate-600">These links use active connected shop data from PrintOn24. Shop names and locations are not connected to any customer report data.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{shops.length === 0 ? <p className="text-sm text-slate-500">Active partner shops will appear when verified vendor data is available.</p> : shops.slice(0, 8).map(shop => <div key={shop.id} className="rounded-2xl border border-slate-200 p-4"><h3 className="font-bold">{shop.name}</h3><p className="mt-1 text-sm text-slate-500">{shop.address || shop.city}</p><a className="mt-3 inline-block text-sm font-bold text-[#FF1300] underline" href={`/shops/${shop.city.toLowerCase()}/${shopSlug(shop.name)}`}>View print shop</a></div>)}</div></section>

        <nav className="mt-6 flex flex-wrap gap-4 text-sm font-bold"><a className="text-[#FF1300] underline" href="/">printOn24 Home</a><a className="text-[#FF1300] underline" href="/upload">Upload and print</a><a className="text-[#FF1300] underline" href="/shops">Find a print shop</a><a className="text-[#FF1300] underline" href="/privacy-policy">Privacy Policy</a></nav>
        <p className="mt-4 text-xs text-slate-500">Last updated: 29 October 2026</p>
        </div>
      </div>
    </main>
  );
};

export default PublicPrintReportsPage;
