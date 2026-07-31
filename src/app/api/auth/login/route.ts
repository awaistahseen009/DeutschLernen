import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Query user by email
    const res = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials. Please set up admin user via CMD.' }, { status: 401 });
    }

    const user = res.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'deutschmeister_secret_key',
      { expiresIn: '30d' }
    );

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      token
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
