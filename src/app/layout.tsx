import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CampaignLog — The shared brain for your marketing team',
  description: 'Log every campaign change, track outcomes, and never lose context again. Git for marketing decisions.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'CampaignLog',
    description: 'Log campaign changes. Track outcomes. Never lose context again.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
