import { ReactNode, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarProvider, 
  SidebarTrigger, 
  SidebarFooter,
  SidebarGroup,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from '../ui/sidebar';
import { MobileHeader, MobileMenuOverlay } from '../ui/mobile-navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Home,
  Settings,
  LogOut,
  User,
  History,
  ChevronDown,
  ChevronRight,
  MessagesSquareIcon,
} from 'lucide-react';

import { appName } from '../../lib/utils';
import Logo from '../../assets/images/vmo.jpg';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  roles: string[];
  subItems?: SubMenuItem[];
}

interface SubMenuItem {
  id: string;
  label: string;
  path: string;
  roles: string[];
}

export const DashboardLayout = ({ children, currentPage }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['legislatives', 'lookup']);

  if (!user) return null;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getMenuItems = (): MenuItem[] => {
    const allItems: MenuItem[] = [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: Home, 
        path: '/admin/dashboard', 
        roles: ['Admin', 'Member', 'Staff', 'Tracker', 'Uploader'] 
      },
      { 
        id: 'communications', 
        label: 'Communications', 
        icon: MessagesSquareIcon, 
        path: '/admin/communications', 
        roles: ['Admin', 'Member', 'Staff', 'Tracker', 'Uploader'] 
      },
      { 
        id: 'users', 
        label: 'Users', 
        icon: User, 
        path: '/admin/users', 
        roles: ['Admin'] 
      },
      { 
        id: 'audit', 
        label: 'Audit Trail', 
        icon: History, 
        path: '/admin/audit-trail', 
        roles: ['Admin'] 
      },
    ];

    if (!user) return [];

    return allItems.filter(item => item.roles.includes(user.user_type));
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

  const menuItems = getMenuItems();

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <Sidebar>
          <SidebarHeader className="p-4 border-sidebar-border border-b">
            <div className="flex items-center gap-3">
              <div className="flex flex-shrink-0 justify-center items-center w-14 h-14">
                <img src={Logo} alt="Logo" className="w-14 h-14 object-contain" />
              </div>
              <div className="flex-1 min-w-0 text-gray-700">
                <div className="font-bold text-lg truncate leading-tight">{ appName }</div>
                <div className="text-gray-500 text-xs truncate">Sta. Cruz, Dvo Sur</div>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedGroups.includes(item.id);
                const isActive = isPathActive(item.path);

                return (
                  <SidebarGroup key={item.id}>
                    <SidebarMenuItem>
                      {hasSubItems ? (
                        <>
                          <SidebarMenuButton
                            onClick={() => toggleGroup(item.id)}
                            isActive={isActive}
                            className="group justify-start hover:shadow-sm px-3 py-2.5 rounded-lg w-full font-medium text-sm hover:scale-[1.01] transition-all duration-200"
                          >
                            <div className="flex flex-shrink-0 justify-center items-center bg-primary/10 rounded-md w-7 h-7 transition-colors duration-200">
                              <item.icon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="flex-1 ml-2.5 text-left truncate transition-colors duration-200">
                              {item.label}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="flex-shrink-0 ml-auto w-4 h-4 transition-transform" />
                            ) : (
                              <ChevronRight className="flex-shrink-0 ml-auto w-4 h-4 transition-transform" />
                            )}
                          </SidebarMenuButton>
                          
                          {isExpanded && (
                            <SidebarMenuSub className="space-y-1 mt-1 ml-2 pl-3 border-sidebar-border border-l-2 cursor-pointer">
                              {item.subItems!.filter(subItem => 
                                subItem.roles.includes(user.user_type)
                              ).map((subItem) => (
                                <SidebarMenuSubItem key={subItem.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => navigate(subItem.path)}
                                    isActive={location.pathname === subItem.path}
                                    className="hover:bg-sidebar-accent px-3 py-2 rounded-md w-full text-sm transition-colors"
                                  >
                                    <span className="truncate">{subItem.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                        </>
                      ) : (
                        <SidebarMenuButton
                          onClick={() => navigate(item.path)}
                          isActive={isActive}
                          className="group justify-start hover:shadow-sm px-3 py-2.5 rounded-lg w-full font-medium text-sm hover:scale-[1.01] transition-all duration-200"
                        >
                          <div className="flex flex-shrink-0 justify-center items-center bg-primary/10 rounded-md w-7 h-7 transition-colors duration-200">
                            <item.icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="flex-1 ml-2.5 text-left truncate transition-colors duration-200">
                            {item.label}
                          </span>
                          {item.badge && (
                            <Badge variant="destructive" className="flex-shrink-0 shadow-sm ml-auto px-1.5 py-0.5 rounded-full text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  </SidebarGroup>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-sidebar-border border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="justify-start hover:bg-sidebar-accent p-3 rounded-lg w-full min-h-touch hover:scale-[1.01] transition-all duration-200">
                  <Avatar className="flex-shrink-0 ring-2 ring-primary/20 w-9 h-9">
                    <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
                      {([user.first_name[0], user.last_name[0]]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 items-start ml-3 min-w-0">
                    <span className="w-auto font-medium text-foreground text-sm truncate">
                      {user.first_name}
                    </span>
                    <Badge className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(user.user_type)}`}>
                      {user.user_type}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-2 w-64">
                <div className="mb-2 px-3 py-2">
                  <p className="font-medium text-foreground text-sm">{user.first_name}</p>
                  <p className="text-muted-foreground text-xs">{user.user_type} Account</p>
                </div>
                <DropdownMenuItem onClick={() => navigate('/my-profile')} className="px-3 py-3 rounded-lg">
                  <div className="flex justify-center items-center bg-blue-100 mr-3 rounded-lg w-8 h-8">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-base">Profile Settings</span>
                </DropdownMenuItem>
                {user.user_type === 'Admin' && (
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="px-3 py-3 rounded-lg">
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
        </Sidebar>

        <div className="flex flex-col flex-1 w-full min-w-0">
          {/* Mobile Header */}
          <div className="lg:hidden top-0 z-50 sticky">
            <MobileHeader
              currentPage={currentPage || 'dashboard'}
              userName={user.first_name}
              isMenuOpen={isMobileMenuOpen}
              onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </div>

          {/* Desktop Header */}
          <header className="hidden lg:block top-0 z-40 sticky bg-white shadow-sm px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <div className="flex flex-1 items-center gap-4 min-w-0">
                <SidebarTrigger className="flex-shrink-0 min-w-touch min-h-touch" />
                <div className="min-w-0">
                  <h1 className="font-bold text-2xl truncate capitalize">
                    {(currentPage || 'dashboard').replace('-', ' ')}
                  </h1>
                  <p className="mt-1 text-muted-foreground text-lg truncate">
                    Welcome back, {user.first_name}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-4">
                <Avatar 
                  onClick={() => navigate('/my-profile')} 
                  className="hover:bg-primary/55 w-10 h-10 transition-all duration-200 cursor-pointer"
                >
                  <AvatarFallback className="text-base">
                    {([user.first_name[0], user.last_name[0]]).join('')}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="flex-1 bg-gray-50 p-3 sm:p-4 lg:p-6">
            <div className="accessibility-enhanced">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        menuItems={menuItems}
        expandedGroups={expandedGroups}
        onToggleGroup={toggleGroup}
      />
    </SidebarProvider>
  );
};