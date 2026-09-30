import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

// Self-hosted by Next at build time: no render-blocking request to Google,
// no layout shift. Exposed as CSS variables consumed by globals.css/Tailwind.
const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin', 'vietnamese'], variable: '--font-grotesk', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin', 'vietnamese'], variable: '--font-jetbrains', display: 'swap' });

export const metadata = {
  title: 'BashLab — Learn Bash by doing',
  description: 'Learn Bash one small step at a time. Try a command, understand what it does, and build confidence through guided practice.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Icon font pinned to the one instance we render (opsz 24, wght 400,
            FILL 0): ~320KB instead of the ~1.1MB full variable range.
            display=block hides ligature names ("arrow_back") until it loads. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
        />
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
