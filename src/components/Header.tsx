import { Menu, Search, Bell, Moon } from 'lucide-react';

export function Header() {
  return (
    <header className="h-20 glass-header flex items-center justify-between px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search Keyword" 
            className="pl-10 pr-4 py-2 glass-input rounded-full text-sm w-64 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all appearance-none leading-normal m-0 border-t"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          <Moon className="w-5 h-5" />
        </button>
        <button className="text-gray-600 hover:text-gray-900 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-sm shadow-red-500/50"></span>
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/60 shadow-sm">
          <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User profile" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}
