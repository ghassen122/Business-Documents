import type { Metadata } from 'next'
import '../styles/globals.css'
import StoreProvider from './StoreProvider'

export const metadata: Metadata = {
  title: 'DocGen',
  description: 'Générez vos documents juridiques en toute simplicité',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  )
}
