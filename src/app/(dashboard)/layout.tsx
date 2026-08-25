import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DriverSidebar from '@/components/DriverSidebar';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'VanTracker - Fleet Management',
  description: 'Real-time van tracking system',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error('Session error:', error);
    redirect('/login');
  }

  if (!session) {
    redirect('/login');
  }

  const role = (session.user as any).role;

  if (role === 'driver') {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <DriverSidebar user={session.user} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
