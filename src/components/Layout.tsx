import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ScrollArea } from './ui/scroll-area';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1">
        <ScrollArea className="h-screen">
          <div className="container p-8">
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}