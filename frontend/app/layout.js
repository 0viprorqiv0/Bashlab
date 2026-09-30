import './globals.css';

export const metadata = {
  title: 'BashLab — Learn Bash by doing',
  description: 'Learn Bash one small step at a time. Try a command, understand what it does, and build confidence through guided practice.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}