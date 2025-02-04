import { NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Crown, Users, Clock, Settings, LayoutDashboard, Link2, Lock, DoorClosed, ChevronRight, ChevronLeft, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';

type Branch = {
  id: string;
  name: string;
};

export default function Sidebar() {
  const { branchId } = useParams<{ branchId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const isDeveloper = sessionStorage.getItem('developerAuth') === 'true';
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    async function loadBranches() {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      
      if (data) {
        setBranches(data);
        if (branchId) {
          const branch = data.find(b => b.id === branchId);
          if (branch) setSelectedBranch(branch);
        }
      }
    }

    loadBranches();
  }, [branchId]);

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    setSelectedBranch(branch || null);

    if (branch) {
      const currentPath = window.location.pathname;
      const timestamp = Date.now();
      if (currentPath.includes('/queue')) {
        navigate(`/branch/${branch.id}/queue?t=${timestamp}`);
      } else if (currentPath.includes('/rooms')) {
        navigate(`/branch/${branch.id}/rooms?t=${timestamp}`);
      } else if (currentPath.includes('/status')) {
        navigate(`/branch/${branch.id}/status?t=${timestamp}`);
      } else if (currentPath === '/' || currentPath.includes('/branch/')) {
        navigate(`/branch/${branch.id}?t=${timestamp}`);
      }
    }
  };

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.removeItem('developerAuth');
    sessionStorage.removeItem('branchAuth');
    sessionStorage.removeItem('branchId');

    // Show success message
    toast({
      title: "تم تسجيل الخروج",
      description: "تم تسجيل خروجك بنجاح",
    });

    // Navigate to welcome page
    navigate('/welcome');
  };

  const isLinkActive = (path: string) => {
    if (path === '/branch-links' || path === '/settings' || path === '/password') {
      return location.pathname === path;
    }
    
    // For branch-specific routes, check if the current path matches the pattern
    if (selectedBranch) {
      const branchPath = `/branch/${selectedBranch.id}`;
      if (path === branchPath) {
        return location.pathname === branchPath;
      } else if (path === `${branchPath}/queue`) {
        return location.pathname === `${branchPath}/queue`;
      } else if (path === `${branchPath}/rooms`) {
        return location.pathname === `${branchPath}/rooms`;
      } else if (path === `${branchPath}/status`) {
        return location.pathname === `${branchPath}/status`;
      }
    }
    return false;
  };

  const navigation = [
    // Developer-only items first
    { name: 'روابط الفروع', icon: Link2, href: '/branch-links', developerOnly: true },
    { name: 'لوحة التحكم', icon: LayoutDashboard, href: selectedBranch ? `/branch/${selectedBranch.id}` : '#', requiresBranch: true },
    { name: 'إدارة الطوابير', icon: Users, href: selectedBranch ? `/branch/${selectedBranch.id}/queue` : '#', requiresBranch: true },
    { name: 'إدارة الغرف', icon: DoorClosed, href: selectedBranch ? `/branch/${selectedBranch.id}/rooms` : '#', requiresBranch: true },
    { name: 'شاشة الحالة', icon: Clock, href: selectedBranch ? `/branch/${selectedBranch.id}/status` : '#', requiresBranch: true },
    { name: 'الإعدادات', icon: Settings, href: '/settings', developerOnly: true },
    { name: 'كلمة المرور', icon: Lock, href: '/password' },
  ];

  return (
    <div className={cn(
      "bg-card border-l transition-all duration-300 flex flex-col h-screen",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="h-16 flex items-center justify-between border-b px-4">
        <h1 className={cn(
          "text-2xl font-amiri text-gold transition-opacity duration-300",
          isCollapsed ? "opacity-0 w-0" : "opacity-100"
        )}>
          زاد السلطان
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="shrink-0"
        >
          {isCollapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isDeveloper && !isCollapsed && (
        <div className="p-4 border-b">
          <select
            className="w-full p-2 rounded-lg border border-border bg-background"
            value={selectedBranch?.id || ''}
            onChange={(e) => handleBranchChange(e.target.value)}
          >
            <option value="">اختر الفرع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 p-4">
        {navigation.map((item) => {
          // Skip developer-only items for branch managers
          if (item.developerOnly && !isDeveloper) return null;

          // Check if the item requires a branch selection
          const isDisabled = item.requiresBranch && !selectedBranch;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1",
                  isLinkActive(item.href)
                    ? "bg-gold/10 text-gold"
                    : "text-muted-foreground hover:bg-gold/5",
                  isDisabled && "opacity-50 pointer-events-none"
                )
              }
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                  toast({
                    title: "تنبيه",
                    description: "الرجاء اختيار الفرع أولاً",
                    variant: "destructive"
                  });
                }
              }}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn(
                "transition-all duration-300",
                isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"
              )}>
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Button */}
      {(isDeveloper || sessionStorage.getItem('branchAuth') === 'true') && (
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10",
              isCollapsed && "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={cn(
              "transition-all duration-300",
              isCollapsed ? "hidden" : "block"
            )}>
              تسجيل خروج
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}