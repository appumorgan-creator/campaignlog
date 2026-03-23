import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CampaignLog — The shared brain for your marketing team',
  description: 'Log every campaign change, track outcomes, and never lose context again.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      </head>
      <body style={{ margin: 0, background: '#f9f9f9', fontFamily: "'Inter', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
