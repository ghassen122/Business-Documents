import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import '../styles/globals.css'

const PUBLIC_PATHS = ['/login']

function hasCookie(name: string): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(name + '='))
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(router.pathname)
    const authenticated = hasCookie('admin_session')

    if (!authenticated && !isPublic) {
      router.replace('/login')
    } else if (authenticated && router.pathname === '/login') {
      router.replace('/')
    }
  }, [router.pathname])

  return <Component {...pageProps} />
}
