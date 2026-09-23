import type { Metadata } from 'next';
import Header from '@/components/site/Header';
import Hero from '@/components/site/Hero';
import BookingRoot from '@/components/booking/BookingRoot';
import {
  AboutSection,
  BrandsSection,
  ContactsSection,
  FaqSection,
  Footer,
  HowItWorksSection,
  ReviewsSection,
  ServicesSection,
  WhyUsSection,
} from '@/components/site/Sections';
import { SEO } from '@/content/business';

export const metadata: Metadata = {
  title: { absolute: SEO.title },
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <ServicesSection />
        <HowItWorksSection />
        <WhyUsSection />
        <AboutSection />
        <ReviewsSection />
        <BrandsSection />
        <FaqSection />
        <ContactsSection />
      </main>

      <Footer />
      <BookingRoot />
    </>
  );
}
