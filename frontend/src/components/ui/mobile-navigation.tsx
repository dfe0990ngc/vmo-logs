import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './badge';
import {
  Home,
  User,
  Settings,
  LogOut,
  Users,
  Newspaper,
  Scale,
  FolderTree,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { SidebarFooter } from './sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu';
import { Button } from './button';
import { Avatar, AvatarFallback } from './avatar';
import { appName, appVersion } from '../../lib/utils';
import Logo from '../../assets/images/logo.png';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  roles: string[];
  subItems?: {
    id: string;
    label: string;
    path: string;
    roles: string[];
  }[];
}

interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  roles?: string[];
}

export function MobileBottomNavigation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const getBottomNavItems = (): MobileNavItem[] => {
    const allItems: MobileNavItem[] = [
      { id: 'dashboard', label: 'Home', icon: Home, path: '/admin/dashboard', roles: ['Admin', 'Member', 'Staff'] },
      { id: 'members', label: 'Members', icon: Users, path: '/admin/members', roles: ['Admin', 'Member', 'Staff'] },
      { id: 'legislatives', label: 'Legislative', icon: Scale, path: '/admin/legislatives', roles: ['Admin', 'Member', 'Staff'] },
      { id: 'documents', label: 'Docs', icon: FolderTree, path: '/admin/documents', roles: ['Admin', 'Member', 'Staff'] },
      { id: 'news', label: 'News', icon: Newspaper, path: '/admin/news', roles: ['Admin', 'Member', 'Staff'] },
    ];

    const filteredItems = allItems.filter(item => item.roles?.includes(user.user_type));
    return filteredItems.slice(0, 5);
  };

  const bottomNavItems = getBottomNavItems();

  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="lg:hidden right-0 bottom-0 safe-bottom left-0 z-50 fixed bg-white shadow-lg border-border border-t">
      <nav className="gap-1 grid grid-cols-5 px-2 py-2">
        {bottomNavItems.map((item) => {
          const isActive = isPathActive(item.path);
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`
                relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-h-touch
                ${isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              <div className="relative">
                <Icon className="mb-1 w-5 h-5" />
                {item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="-top-2 -right-2 absolute flex justify-center items-center p-0 w-4 h-4 text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="w-full font-medium text-[10px] text-center truncate leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

interface MobileHeaderProps {
  currentPage: string;
  userName: string;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function MobileHeader({ currentPage, userName, onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="lg:hidden safe-top top-0 z-40 sticky bg-white shadow-sm px-4 py-3 border-border border-b">
      <div className="flex justify-between items-center">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="flex-shrink-0 hover:bg-accent p-2 rounded-lg min-w-touch min-h-touch transition-colors"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <div className={`w-6 h-6 flex flex-col justify-center items-center transition-all duration-300 ${isMenuOpen ? 'rotate-45' : ''}`}>
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-0.5' : '-translate-y-1'}`} />
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-0.5' : 'translate-y-1'}`} />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate capitalize leading-tight">
              {(currentPage || 'dashboard').replace('-', ' ')}
            </h1>
            <p className="text-muted-foreground text-xs truncate">
              Hi, {userName.split(' ')[0]}
            </p>
          </div>
        </div>
        
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => navigate('/my-profile')}
            className="hover:bg-accent p-1 rounded-full min-w-touch min-h-touch transition-colors"
          >
            <div className="flex justify-center items-center bg-primary/10 rounded-full w-8 h-8">
              <User className="w-4 h-4 text-primary" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}

interface MobileMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  expandedGroups: string[];
  onToggleGroup: (groupId: string) => void;
}

export function MobileMenuOverlay({ 
  isOpen, 
  onClose, 
  menuItems, 
  expandedGroups, 
  onToggleGroup 
}: MobileMenuOverlayProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-orange-100 text-orange-800';
      case 'Member': return 'bg-blue-100 text-blue-800';
      case 'Staff': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="lg:hidden z-40 fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="lg:hidden top-0 left-0 z-50 fixed flex flex-col bg-white shadow-xl w-80 max-w-[85%] h-full overflow-hidden animate-slide-in-left">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-border border-b">
          <div className="flex items-center gap-3">
            <div className="flex flex-shrink-0 justify-center items-center w-12 h-12">
              <img src={Logo} alt="Logo" className="w-12 h-12 object-contain" />
            </div>
            <div className="flex-1 min-w-0 text-gray-700">
              <div className="font-bold text-lg truncate leading-tight">{ appName }</div>
              <div className="text-gray-500 text-xs truncate">Sta. Cruz, Dvo Sur</div>
              <div className="mt-0.5 text-[10px] text-gray-400">v{appVersion}</div>
            </div>
          </div>
        </div>
        
        {/* Menu Items - Scrollable */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="space-y-1 px-3">
            {menuItems.map((item) => {
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedGroups.includes(item.id);
              const isActive = isPathActive(item.path);
              const Icon = item.icon;
              
              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (hasSubItems) {
                        onToggleGroup(item.id);
                      } else {
                        handleNavigation(item.path);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-2 p-2.5 rounded-xl transition-all duration-200 min-h-touch
                      ${isActive && !hasSubItems
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    <div className="flex flex-shrink-0 justify-center items-center bg-primary/10 rounded-lg w-9 h-9">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="flex-1 font-medium text-sm text-left truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <Badge variant="destructive" className="flex-shrink-0 px-2 py-1 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {hasSubItems && (
                      isExpanded ? (
                        <ChevronDown className="flex-shrink-0 ml-auto w-4 h-4 transition-transform" />
                      ) : (
                        <ChevronRight className="flex-shrink-0 ml-auto w-4 h-4 transition-transform" />
                      )
                    )}
                  </button>
                  
                  {/* Sub Items */}
                  {hasSubItems && isExpanded && (
                    <div className="space-y-1 mt-1 ml-11 pl-3 border-primary/20 border-l-2">
                      {item.subItems!.filter(subItem => 
                        subItem.roles.includes(user?.user_type || '')
                      ).map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={() => handleNavigation(subItem.path)}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm
                            ${location.pathname === subItem.path
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }
                          `}
                        >
                          <span className="block truncate">{subItem.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
        
        {/* Footer */}
        <SidebarFooter className="flex-shrink-0 p-3 border-sidebar-border border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="justify-start hover:bg-sidebar-accent p-3 rounded-lg w-full min-h-touch hover:scale-[1.01] transition-all duration-200">
                <Avatar className="flex-shrink-0 ring-2 ring-primary/20 w-9 h-9">
                  <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
                    {user ? ([user.first_name[0], user.last_name[0]]).join('') : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 items-start ml-3 min-w-0">
                  <span className="w-auto font-medium text-foreground text-sm truncate">
                    {user?.first_name}
                  </span>
                  <Badge className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(user?.user_type || '')}`}>
                    {user?.user_type || 'User'}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-2 w-64">
              <div className="mb-2 px-3 py-2">
                <p className="font-medium text-foreground text-sm">{user?.first_name}</p>
                <p className="text-muted-foreground text-xs">{user?.user_type} Account</p>
              </div>
              <DropdownMenuItem onClick={() => handleNavigation('/my-profile')} className="px-3 py-3 rounded-lg">
                <div className="flex justify-center items-center bg-blue-100 mr-3 rounded-lg w-8 h-8">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-base">Profile Settings</span>
              </DropdownMenuItem>
              {user?.user_type === 'Admin' && (
                <DropdownMenuItem onClick={() => handleNavigation('/settings')} className="px-3 py-3 rounded-lg">
                  <div className="flex justify-center items-center bg-gray-100 mr-3 rounded-lg w-8 h-8">
                    <Settings className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-base">System Settings</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={logout} className="hover:bg-red-50 px-3 py-3 rounded-lg text-red-600">
                <div className="flex justify-center items-center bg-red-100 mr-3 rounded-lg w-8 h-8">
                  <LogOut className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-base">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </div>
    </>
  );
}