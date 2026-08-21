import Script from "next/script";
import { gaMeasurementId } from "@/lib/analytics";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";

export function GoogleAnalytics() {
  const measurementId = gaMeasurementId();
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${measurementId}');
`}
      </Script>
      <AnalyticsTracker />
    </>
  );
}
