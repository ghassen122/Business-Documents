import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const session   = request.cookies.get('admin_session')
  const { pathname } = request.nextUrl

  // Already authenticated → redirect away from login
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Not authenticated → redirect to login page
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Protect all routes except static files and the login API itself
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/admin-login).*)'],
}
