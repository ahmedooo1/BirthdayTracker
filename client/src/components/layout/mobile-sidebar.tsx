import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Calendar, Users, Settings, LogOut, X, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  const getUserInitials = () => {
    return user.username?.substring(0, 2).toUpperCase() || "??";
  };
  
  const getUserRoleText = () => {
    switch (user.role) {
      case "ADMIN":
        return "Administrateur";
      case "GROUP_LEADER":
        return "Chef de groupe";
      case "MEMBER":
        return "Membre";
      default:
        return "Membre";
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Top bar with menu button for mobile */}
      <div className="sticky top-0 z-10 bg-white pl-1 pt-1 sm:pl-3 sm:pt-3 md:hidden shadow-md">
        <button 
          onClick={() => setSidebarOpen(true)} 
          className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
        >
          <span className="sr-only">Ouvrir le menu</span>
          <Menu className="h-6 w-6" />
        </button>
      </div>
      
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden" role="dialog">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800 transform transition-all ease-in-out duration-300">
            {/* Close button */}
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <span className="sr-only">Fermer le menu</span>
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center h-16 bg-gray-900">
                <span className="text-xl font-semibold text-white">RappelAnniv</span>
              </div>
              
              <nav className="mt-5 flex-1 px-2 space-y-1">
                <Link href="/">
                  <a 
                    className={cn(
                      "flex items-center px-4 py-2 text-sm rounded-md group",
                      location === "/" 
                        ? "bg-gray-900 text-white" 
                        : "text-gray-300 hover:bg-gray-700"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Home className="mr-3 h-6 w-6" />
                    Tableau de bord
                  </a>
                </Link>
                <Link href="/birthdays">
                  <a 
                    className={cn(
                      "flex items-center px-4 py-2 text-sm rounded-md group",
                      location === "/birthdays" 
                        ? "bg-gray-900 text-white" 
                        : "text-gray-300 hover:bg-gray-700"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Calendar className="mr-3 h-6 w-6" />
                    Anniversaires
                  </a>
                </Link>
                <Link href="/groups">
                  <a 
                    className={cn(
                      "flex items-center px-4 py-2 text-sm rounded-md group",
                      location === "/groups" 
                        ? "bg-gray-900 text-white" 
                        : "text-gray-300 hover:bg-gray-700"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Users className="mr-3 h-6 w-6" />
                    Groupes
                  </a>
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/users">
                    <a 
                      className={cn(
                        "flex items-center px-4 py-2 text-sm rounded-md group",
                        location === "/users" 
                          ? "bg-gray-900 text-white" 
                          : "text-gray-300 hover:bg-gray-700"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Users className="mr-3 h-6 w-6" />
                      Utilisateurs
                    </a>
                  </Link>
                )}
                <Link href="/settings">
                  <a 
                    className={cn(
                      "flex items-center px-4 py-2 text-sm rounded-md group",
                      location === "/settings" 
                        ? "bg-gray-900 text-white" 
                        : "text-gray-300 hover:bg-gray-700"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Settings className="mr-3 h-6 w-6" />
                    Paramètres
                  </a>
                </Link>
              </nav>
              
              <div className="p-4 border-t border-gray-700">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Avatar className="h-8 w-8 bg-gray-600 text-white">
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">{user.username}</p>
                    <p className="text-xs text-gray-300">{getUserRoleText()}</p>
                  </div>
                  <Button 
                    onClick={handleLogout} 
                    variant="ghost" 
                    size="icon" 
                    className="ml-auto text-gray-300 hover:text-white"
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-14"></div>
        </div>
      )}
    </>
  );
}
