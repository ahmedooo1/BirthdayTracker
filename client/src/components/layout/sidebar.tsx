import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Calendar, Users, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
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
  };

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gray-800 text-white">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 bg-gray-900">
          <span className="text-2xl font-semibold">RappelAnniv</span>
        </div>
        
        {/* Nav Links */}
        <nav className="mt-5 flex-1 px-2 space-y-1">
          <TooltipProvider>
            <Link href="/">
              <a className={cn(
                "flex items-center px-4 py-2 text-sm rounded-md group",
                location === "/" 
                  ? "bg-gray-900 text-white" 
                  : "text-gray-300 hover:bg-gray-700"
              )}>
                <Home className="mr-3 h-6 w-6" />
                Tableau de bord
              </a>
            </Link>
            <Link href="/birthdays">
              <a className={cn(
                "flex items-center px-4 py-2 text-sm rounded-md group",
                location === "/birthdays" 
                  ? "bg-gray-900 text-white" 
                  : "text-gray-300 hover:bg-gray-700"
              )}>
                <Calendar className="mr-3 h-6 w-6" />
                Anniversaires
              </a>
            </Link>
            <Link href="/groups">
              <a className={cn(
                "flex items-center px-4 py-2 text-sm rounded-md group",
                location === "/groups" 
                  ? "bg-gray-900 text-white" 
                  : "text-gray-300 hover:bg-gray-700"
              )}>
                <Users className="mr-3 h-6 w-6" />
                Groupes
              </a>
            </Link>
            {user.role === "ADMIN" && (
              <Link href="/users">
                <a className={cn(
                  "flex items-center px-4 py-2 text-sm rounded-md group",
                  location === "/users" 
                    ? "bg-gray-900 text-white" 
                    : "text-gray-300 hover:bg-gray-700"
                )}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        <Users className="mr-3 h-6 w-6" />
                        Utilisateurs
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Réservé aux administrateurs</p>
                    </TooltipContent>
                  </Tooltip>
                </a>
              </Link>
            )}
            <Link href="/settings">
              <a className={cn(
                "flex items-center px-4 py-2 text-sm rounded-md group",
                location === "/settings" 
                  ? "bg-gray-900 text-white" 
                  : "text-gray-300 hover:bg-gray-700"
              )}>
                <Settings className="mr-3 h-6 w-6" />
                Paramètres
              </a>
            </Link>
          </TooltipProvider>
        </nav>
        
        {/* User Menu */}
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
  );
}
