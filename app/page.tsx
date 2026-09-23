import type { Metadata } from 'next';
import { loadSiteData } from '@/lib/site-data';
import { toServiceOption } from '@/components/booking/types';
import Header from '@/components/site/Header';
import StickyBar from '@/components/site/StickyBar';
import BookingRoot from '@/components/booking/BookingRoot';
import {
  BrandsSection,
  ContactsSection,
  FaqSection,
  Footer,
  GallerySection,
  HeroSection,
  ReviewsSection,
  ServicesSection,
  StepsSection,
  WhyUsSection,
} from '@/components/site/Sections';
import { SEO } from '@/content/business';

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: SEO.title },
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const data = loadSiteData();
  const serviceOptions = data.services.map(toServiceOption);

  return (
    <>
      <Header phoneDisplay={data.contacts.phoneDisplay} phoneE164={data.contacts.phoneE164} />

      <main className="pb-[84px] md:pb-0">
        <HeroSection contacts={data.contacts} settings={data.settings} daysOff={data.daysOff} />

        {data.services.length > 0 ? (
          <ServicesSection services={data.services} />
        ) : (
          <section className="container-x py-12">
            <p className="card p-5 text-[15px] text-[var(--color-muted)]">
              Список услуг формируется — позвоните нам, и мы подскажем, что нужно вашему автомобилю.
            </p>
          </section>
        )}

        <StepsSection />
        <BrandsSection />
        <WhyUsSection settings={data.settings} />
        <ReviewsSection reviews={data.reviews} />
        <GallerySection photos={data.photos} />
        <FaqSection />
        <ContactsSection contacts={data.contacts} />
      </main>

      <Footer contacts={data.contacts} />

      <StickyBar
        phoneDisplay={data.contacts.phoneDisplay}
        phoneE164={data.contacts.phoneE164}
        waNumber={data.contacts.whatsapp[0].wa}
      />

      <BookingRoot
        services={serviceOptions}
        phoneDisplay={data.contacts.phoneDisplay}
        phoneE164={data.contacts.phoneE164}
      />
    </>
  );
}
