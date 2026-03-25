import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CampaignLog — The shared brain for your marketing team',
  description: 'Log every campaign change, track outcomes, and never lose context again.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
