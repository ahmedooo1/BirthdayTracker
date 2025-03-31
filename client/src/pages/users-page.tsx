import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { User, UserRole } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export default function UsersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Fetch all users (admin only)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      setIsChangeRoleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été mis à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Role change form schema
  const roleChangeSchema = z.object({
    role: z.enum(["ADMIN", "GROUP_LEADER", "MEMBER"], {
      required_error: "Le rôle est requis",
    }),
  });
  
  const roleChangeForm = useForm<z.infer<typeof roleChangeSchema>>({
    resolver: zodResolver(roleChangeSchema),
    defaultValues: {
      role: selectedUser?.role as UserRole || UserRole.MEMBER,
    },
  });
  
  // Reset form when selected user changes
  React.useEffect(() => {
    if (selectedUser) {
      roleChangeForm.reset({
        role: selectedUser.role as UserRole,
      });
    }
  }, [selectedUser, roleChangeForm]);
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    return user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.email.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setIsChangeRoleDialogOpen(true);
  };
  
  const handleRoleChangeSubmit = (data: z.infer<typeof roleChangeSchema>) => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: data.role });
    }
  };
  
  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "GROUP_LEADER":
        return "bg-blue-100 text-blue-800";
      case "MEMBER":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrateur";
      case "GROUP_LEADER":
        return "Chef de groupe";
      case "MEMBER":
        return "Membre";
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="lg:pl-64 flex flex-col flex-1">
        <MobileSidebar />
        
        <main className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Gestion des utilisateurs</h1>
                <p className="mt-1 text-sm text-gray-500">Gérez les rôles et les accès des utilisateurs</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                className="pl-10 w-full"
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Users List */}
            {isLoadingUsers ? (
              <div className="text-center py-10">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-500">Chargement des utilisateurs...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="bg-white shadow overflow-hidden rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <li key={user.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 bg-blue-500 text-white">
                            <AvatarFallback>{getUserInitials(user.username)}</AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Badge className={`mr-4 ${getRoleBadgeColor(user.role)}`}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleChangeRole(user)}
                          >
                            <UserCog className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden rounded-md p-6 text-center">
                <p className="text-gray-500">
                  {searchQuery 
                    ? "Aucun utilisateur ne correspond à votre recherche" 
                    : "Aucun utilisateur trouvé."}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Change Role Dialog */}
      <Dialog open={isChangeRoleDialogOpen} onOpenChange={setIsChangeRoleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le rôle de l'utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="flex items-center mb-4">
              <Avatar className="h-10 w-10 bg-blue-500 text-white">
                <AvatarFallback>{getUserInitials(selectedUser.username)}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{selectedUser.username}</p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>
            </div>
          )}
          <Form {...roleChangeForm}>
            <form onSubmit={roleChangeForm.handleSubmit(handleRoleChangeSubmit)} className="space-y-4">
              <FormField
                control={roleChangeForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrateur</SelectItem>
                        <SelectItem value="GROUP_LEADER">Chef de groupe</SelectItem>
                        <SelectItem value="MEMBER">Membre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsChangeRoleDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
