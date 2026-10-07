import { NextResponse } from 'next/server';

export function middleware(request) {
  const method = request.method;
  const path = request.nextUrl.pathname;

  // Next.js dev server tự động log các page routes (ví dụ: GET /login 200).
  // Đối với các file tĩnh (.js chunks, .css, fonts, static assets),
  // middleware sẽ log chi tiết mã 200 như các web server thực thụ (Python/Nginx/Apache).
  if (
    path.startsWith('/_next/static/') ||
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    path.endsWith('.ico') ||
    path.endsWith('.png') ||
    path.endsWith('.svg') ||
    path.endsWith('.woff2')
  ) {
    console.log(`${method} ${path} 200 in 1ms`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
