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
        <div className="print:hidden"><Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} /></div>
        <div className={`flex flex-col w-full min-h-screen transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'} print:pl-0 print:w-full print:block`}>
          <div className="print:hidden"><Header setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} /></div>
          <main className="flex-1 p-6 relative print:p-0 print:m-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
