// Vercel Middleware - Security
import { NextResponse } from 'next/server';

export function middleware(request) {
    const response = NextResponse.next();
    
    // Security Headers
    const securityHeaders = {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.groq.com https://*.supabase.co;",
    };
    
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    
    // Block suspicious requests
    const userAgent = request.headers.get('user-agent') || '';
    const url = request.nextUrl.pathname;
    
    // Block common attack patterns
    const blockedPaths = [
        '/wp-admin',
        '/admin',
        '/.env',
        '/.git',
        '/phpmyadmin',
        '/config.php',
        '/server-status',
        '/xmlrpc.php',
    ];
    
    if (blockedPaths.some(path => url.startsWith(path))) {
        return new NextResponse('Access Denied', { status: 403 });
    }
    
    // Block SQL injection patterns
    const sqlPatterns = /(\bUNION\b.*\bSELECT\b)|(\bDROP\b.*\bTABLE\b)|(\bINSERT\b.*\bINTO\b)|('.*--)|(\/\*.*\*\/)/i;
    if (url.match(sqlPatterns)) {
        return new NextResponse('Access Denied', { status: 403 });
    }
    
    return response;
}

export const config = {
    matcher: '/:path*',
};
