import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SmoothScroll from '@/components/SmoothScroll';

export default function SiteLayout({ children }) {
  return (
    <>
      <SmoothScroll />
      <Navbar />
      <main className="pt-16 relative">{children}</main>
      <Footer />
    </>
  );
}
