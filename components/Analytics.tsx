import Script from 'next/script';

/**
 * Analytics is opt-in via env (§11): with no NEXT_PUBLIC_YM_ID / NEXT_PUBLIC_GA_ID nothing is loaded.
 */
export default function Analytics() {
  const ymId = process.env.NEXT_PUBLIC_YM_ID?.trim();
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();

  if (!ymId && !gaId) return null;

  return (
    <>
      {ymId ? (
        <Script id="ym-init" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
            ym(${JSON.stringify(ymId)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});`}
        </Script>
      ) : null}

      {gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', ${JSON.stringify(gaId)}, { anonymize_ip: true });`}
          </Script>
        </>
      ) : null}
    </>
  );
}
