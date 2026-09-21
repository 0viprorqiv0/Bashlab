import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import Footer from '@/components/Footer';

export const metadata = {
  title: '404: Page Not Found — BashLab',
  description: 'The requested path or command could not be found.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#E8E9F0] flex flex-col justify-between selection:bg-[#00FF66] selection:text-[#0A0D14] relative overflow-hidden">
      {/* Background ambient neon radial glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] pointer-events-none -z-0 opacity-40 blur-[100px]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 255, 102, 0.15) 0%, rgba(0, 229, 255, 0.08) 40%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Top Navbar */}
      <header className="w-full border-b border-white/[0.08] bg-[#0A0D14]/80 backdrop-blur-md px-6 lg:px-8 py-3.5 z-10">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="BashLab Home">
            <BrandLogo />
          </Link>
          <Link
            href="/"
            className="font-code text-xs text-[#9BA3B5] hover:text-[#00FF66] transition-colors inline-flex items-center gap-1.5"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back to terminal</span>
          </Link>
        </div>
      </header>

      {/* Center Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 z-10">
        <div className="max-w-[620px] w-full text-center flex flex-col items-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/[0.04] border border-white/10 font-code text-xs text-[#849581]">
            <span className="w-2 h-2 rounded-full bg-[#FF5F56] animate-pulse" aria-hidden="true" />
            <span className="uppercase tracking-widest text-[11px] text-[#FF5F56] font-semibold">STATUS: 404 NOT FOUND</span>
          </div>

          {/* Heading */}
          <h1 className="font-headline font-bold text-4xl sm:text-5xl text-white tracking-tight mb-3">
            Path not found in filesystem
          </h1>

          <p className="font-body text-sm sm:text-base text-[#9BA3B5] max-w-[480px] leading-relaxed mb-8">
            The route or resource you are trying to access does not exist, was moved, or has not been created yet.
          </p>

          {/* Simulated Terminal Error Box */}
          <div className="w-full rounded-xl bg-[#0B0F17] border border-white/10 shadow-2xl overflow-hidden text-left mb-8">
            <div className="px-4 py-2.5 bg-[#121622] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] opacity-80" aria-hidden="true" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] opacity-80" aria-hidden="true" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] opacity-80" aria-hidden="true" />
              </div>
              <span className="font-code text-[11px] text-[#849581]">guest@bashlab: /lost</span>
              <span className="font-code text-[10px] text-white/30">bash</span>
            </div>

            <div className="p-4 sm:p-5 font-code text-xs sm:text-[13px] leading-relaxed space-y-2 text-[#E8E9F0]">
              <div className="flex items-center gap-2">
                <span className="text-[#00E5FF] font-semibold">guest@bashlab:~$</span>
                <span className="text-white">cd /destination</span>
              </div>
              <div className="text-[#FF5F56] pl-4">
                bash: cd: /destination: No such file or directory
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[#00E5FF] font-semibold">guest@bashlab:~$</span>
                <span className="text-white">echo $?</span>
              </div>
              <div className="text-[#F59E0B] pl-4 font-bold">
                404 (EXIT_STATUS_NOT_FOUND)
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/"
              className="btn-primary w-full sm:w-auto text-center !py-2.5 !px-5 !text-xs !gap-2"
            >
              <span className="font-code font-bold">$ cd / (Return Home)</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>

            <Link
              href="/#course"
              className="btn-secondary w-full sm:w-auto text-center !py-2.5 !px-5 !text-xs !gap-2"
            >
              <span className="font-code">Explore Shell 101</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer className="relative z-10" />
    </div>
  );
}
