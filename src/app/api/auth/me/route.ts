import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'deutschmeister_jwt_secret_key_2026');
    return NextResponse.json({
      authenticated: true,
      user: { id: decoded.userId, email: decoded.email }
    });
  } catch (err) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
