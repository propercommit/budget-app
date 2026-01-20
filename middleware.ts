import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PASSWORD = process.env.SITE_PASSWORD;

export function middleware(request: NextRequest) {
  // Skip password check for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check if already authenticated
  const authCookie = request.cookies.get('auth');
  if (authCookie?.value === 'authenticated') {
    return NextResponse.next();
  }

  // Check if trying to authenticate
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  // Redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};