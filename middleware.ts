import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add your allowed origins
const allowedOrigins = [
  'http://localhost:4200',
  'https://adaratranslate.com',  // Replace with your production domain
  'https://your-angular-app.com' // Add any other domains you need
];

export function middleware(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || '';

  // Create a response object from the request
  const response = NextResponse.next();

  // Check if the origin is allowed
  if (allowedOrigins.includes(origin)) {
    // Add the CORS headers to the response
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    // For development, you might want to allow all origins
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

export const config = {
  matcher: '/api/:path*',
}; 