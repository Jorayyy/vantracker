import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import sql from './db';

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const result = await sql`
            SELECT id, email, password_hash, full_name, role, company_id, is_active
            FROM users
            WHERE email = ${credentials.email as string}
          `;

          const user = result[0];
          if (!user || !user.is_active) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          );
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
