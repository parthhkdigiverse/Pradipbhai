import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout({ children, currentPage, setCurrentPage }: { children: ReactNode, currentPage: string, setCurrentPage: (page: string) => void }) {
  return (
    <div className="min-h-screen relative bg-slate-50">
      {/* Animated Background Blobs removed */}

      <div className="relative z-10 flex min-h-screen">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div className="md:pl-64 flex flex-col w-full min-h-screen">
          <Header setCurrentPage={setCurrentPage} />
          <main className="flex-1 p-6 relative">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
