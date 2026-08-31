import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Bloom Invite', description: 'A bouquet that becomes your invitation. Tap to bloom, then scan or open the event.', robots: {index: false, follow: false}, icons: {icon: '/reference/bouquet.jpg'} };
export default function RootLayout({ children }: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
