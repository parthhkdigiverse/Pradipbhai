import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout({ children, currentPage, setCurrentPage }: { children: ReactNode, currentPage: string, setCurrentPage: (page: string) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen relative bg-slate-50">
      {/* Animated Background Blobs removed */}

      <div className="relative z-10 flex min-h-screen">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className={`flex flex-col w-full min-h-screen transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
          <Header setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          <main className="flex-1 p-6 relative">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
