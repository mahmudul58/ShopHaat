import { Helmet } from 'react-helmet-async';

export function SEO({ title, description, image, url }) {
  const defaultTitle = "ShopHaat — Bangladesh's Trusted Marketplace";
  const defaultDescription = "Shop the best products from verified sellers all across Bangladesh. Discover deals on electronics, fashion, home appliances and more.";
  
  const siteTitle = title ? `${title} | ShopHaat` : defaultTitle;
  const siteDescription = description || defaultDescription;
  
  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      
      {/* Open Graph */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
