import { HelmetProvider, Helmet } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";

type PageMetaProps = {
  title?: string;
  description?: string;
  robots?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: string;
  ogSiteName?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const PageMeta = ({
  title,
  description,
  robots,
  canonical,
  ogTitle,
  ogDescription,
  ogUrl,
  ogImage,
  ogImageAlt,
  ogType,
  ogSiteName,
  twitterTitle,
  twitterDescription,
  twitterImage,
  twitterCard,
  jsonLd,
}: PageMetaProps) => (
  <Helmet>
    {title ? <title>{title}</title> : null}
    {description ? <meta name="description" content={description} /> : null}
    {robots ? <meta name="robots" content={robots} /> : null}
    {canonical ? <link rel="canonical" href={canonical} /> : null}
    {ogTitle ? <meta property="og:title" content={ogTitle} /> : null}
    {ogDescription ? <meta property="og:description" content={ogDescription} /> : null}
    {ogUrl ? <meta property="og:url" content={ogUrl} /> : null}
    {ogImage ? <meta property="og:image" content={ogImage} /> : null}
    {ogImageAlt ? <meta property="og:image:alt" content={ogImageAlt} /> : null}
    {ogType ? <meta property="og:type" content={ogType} /> : null}
    {ogSiteName ? <meta property="og:site_name" content={ogSiteName} /> : null}
    {twitterTitle ? <meta name="twitter:title" content={twitterTitle} /> : null}
    {twitterDescription ? <meta name="twitter:description" content={twitterDescription} /> : null}
    {twitterImage ? <meta name="twitter:image" content={twitterImage} /> : null}
    {twitterCard ? <meta name="twitter:card" content={twitterCard} /> : null}
    {jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}
  </Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>
    <TooltipProvider>
      {children}
    </TooltipProvider>
  </HelmetProvider>
);

export default PageMeta;
