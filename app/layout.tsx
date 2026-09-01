import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'JAZZHQ Bloom',
  description: 'Turn any link into a beautiful interactive 3D bloom.',
  openGraph: {
    title: 'A JAZZHQ Bloom for Monu',
    description: 'Turn any link into a beautiful interactive 3D bloom.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'A JAZZHQ Bloom for Monu',
    description: 'Turn any link into a beautiful interactive 3D bloom.',
  },
  robots: { index: false, follow: false },
  icons: { icon: '/reference/bouquet.jpg' },
};
export default function RootLayout({ children }: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
