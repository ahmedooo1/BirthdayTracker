import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Group, UserGroup, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GroupCard } from "@/components/group/group-card";
import { GroupForm, GroupFormData } from "@/components/group/group-form";
import { Plus, Search, UserPlus, X, Settings, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

export default function GroupsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const groupId = params.get("id");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  
  // Fetch all groups
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });
  
  // Fetch group details if groupId is present
  const { data: groupDetails, isLoading: isLoadingGroupDetails } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });
  
  // Fetch group members if viewing group details
  const { data: groupMembers = [], isLoading: isLoadingGroupMembers } = useQuery<UserGroup[]>({
    queryKey: ["/api/groups", groupId, "members"],
    enabled: !!groupId,
  });
  
  // Fetch birthdays for the selected group
  const { data: groupBirthdays = [], isLoading: isLoadingGroupBirthdays } = useQuery({
    queryKey: ["/api/birthdays", { groupId: groupId }],
    enabled: !!groupId,
  });
  
  useEffect(() => {
    if (groupDetails) {
      setSelectedGroup(groupDetails);
    }
  }, [groupDetails]);
  
  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const res = await apiRequest("POST", "/api/groups", data);
      return await res.json();
    },
    onSuccess: (newGroup) => {
      setIsCreateGroupOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Groupe créé",
        description: `Le groupe '${newGroup.name}' a été créé avec succès.`,
      });
      // Redirect to the new group
      setLocation(`/groups?id=${newGroup.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: GroupFormData }) => {
      const res = await apiRequest("PATCH", `/api/groups/${id}`, data);
      return await res.json();
    },
    onSuccess: (updatedGroup) => {
      setEditingGroup(undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      }
      toast({
        title: "Groupe mis à jour",
        description: `Le groupe '${updatedGroup.name}' a été mis à jour avec succès.`,
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
  
  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/groups/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Groupe supprimé",
        description: "Le groupe a été supprimé avec succès.",
      });
      setLocation("/groups");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: number }) => {
      await apiRequest("DELETE", `/api/groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      toast({
        title: "Membre retiré",
        description: "Le membre a été retiré du groupe avec succès.",
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
  
  // Join group form schema
  const joinGroupSchema = z.object({
    groupId: z.string().min(1, "L'identifiant du groupe est requis"),
    password: z.string().optional(),
  });
  
  const joinGroupForm = useForm<z.infer<typeof joinGroupSchema>>({
    resolver: zodResolver(joinGroupSchema),
    defaultValues: {
      groupId: "",
      password: "",
    },
  });
  
  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof joinGroupSchema>) => {
      const res = await apiRequest("POST", `/api/groups/${data.groupId}/members`, {
        userId: user?.id,
        isLeader: false,
      });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      setIsJoinGroupOpen(false);
      joinGroupForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Groupe rejoint",
        description: "Vous avez rejoint le groupe avec succès.",
      });
      // Redirect to the joined group
      setLocation(`/groups?id=${variables.groupId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Invite member form schema
  const inviteMemberSchema = z.object({
    email: z.string().email("Email invalide"),
    isLeader: z.boolean().default(false),
  });
  
  const inviteMemberForm = useForm<z.infer<typeof inviteMemberSchema>>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      isLeader: false,
    },
  });
  
  // Get user by email mutation (for invites)
  const getUserByEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      // This would be an API call in a real app, but since our backend doesn't have this endpoint,
      // we'll show a toast with an explanation
      throw new Error("Cette fonctionnalité n'est pas disponible dans cette version.");
      // In a real app, you'd do something like:
      // const res = await apiRequest("GET", `/api/users/by-email?email=${encodeURIComponent(email)}`);
      // return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation non disponible",
        description: "La fonctionnalité d'invitation par email n'est pas disponible dans cette version de l'application.",
        variant: "destructive",
      });
    },
  });
  
  // Filter groups based on search query
  const filteredGroups = groups.filter(group => {
    if (!searchQuery) return true;
    return group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });
  
  const handleCreateSubmit = (data: GroupFormData) => {
    createGroupMutation.mutate(data);
  };
  
  const handleUpdateSubmit = (data: GroupFormData) => {
    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, data });
    }
  };
  
  const handleJoinGroupSubmit = (data: z.infer<typeof joinGroupSchema>) => {
    joinGroupMutation.mutate(data);
  };
  
  const handleInviteMemberSubmit = (data: z.infer<typeof inviteMemberSchema>) => {
    getUserByEmailMutation.mutate(data.email);
  };
  
  const handleViewGroupDetails = (group: Group) => {
    setSelectedGroup(group);
    setLocation(`/groups?id=${group.id}`);
  };
  
  const handleEditGroup = () => {
    if (selectedGroup) {
      setEditingGroup(selectedGroup);
    }
  };
  
  const handleDeleteGroup = () => {
    if (selectedGroup) {
      setIsDeleteDialogOpen(true);
    }
  };
  
  const confirmDeleteGroup = () => {
    if (selectedGroup) {
      deleteGroupMutation.mutate(selectedGroup.id);
    }
  };
  
  const handleRemoveMember = (userId: number) => {
    if (selectedGroup) {
      removeMemberMutation.mutate({ groupId: selectedGroup.id, userId });
    }
  };
  
  const isUserGroupLeader = () => {
    if (!selectedGroup || !user) return false;
    const member = groupMembers.find(m => m.userId === user.id);
    return member?.isLeader || user.role === "ADMIN";
  };
  
  const getBackToGroups = () => {
    setSelectedGroup(null);
    setLocation("/groups");
  };
  
  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };
  
  const renderGroupList = () => (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Groupes</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez et rejoignez des groupes</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsJoinGroupOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Rejoindre un groupe
          </Button>
          <Button onClick={() => setIsCreateGroupOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un groupe
          </Button>
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
          placeholder="Rechercher un groupe..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoadingGroups ? (
          <div className="col-span-3 text-center py-10">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">Chargement des groupes...</p>
          </div>
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onViewDetails={handleViewGroupDetails}
            />
          ))
        ) : (
          <div className="col-span-3 text-center py-10 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              {searchQuery 
                ? "Aucun groupe ne correspond à votre recherche" 
                : "Vous n'avez pas encore de groupes. Créez un nouveau groupe pour commencer."}
            </p>
            <Button onClick={() => setIsCreateGroupOpen(true)} className="mt-4">
              Créer un groupe
            </Button>
          </div>
        )}
      </div>
    </>
  );
  
  const renderGroupDetails = () => {
    if (!selectedGroup) return null;
    
    const hasEditPermission = isUserGroupLeader();
    
    return (
      <>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={getBackToGroups} className="mr-2">
            <X className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <h1 className="text-2xl font-semibold text-gray-800">{selectedGroup.name}</h1>
          {hasEditPermission && (
            <div className="ml-auto flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleEditGroup}>
                <Settings className="h-4 w-4 mr-1" />
                Modifier
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteGroup}>
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            </div>
          )}
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Détails du groupe</CardTitle>
            <CardDescription>
              {selectedGroup.description || "Aucune description"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Identifiant</p>
                <p className="mt-1">{selectedGroup.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Créé le</p>
                <p className="mt-1">{new Date(selectedGroup.createdAt).toLocaleDateString()}</p>
              </div>
              {selectedGroup.password && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Mot de passe requis</p>
                  <p className="mt-1">Oui</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              <span className="text-sm text-gray-500">
                {groupMembers.length} {groupMembers.length === 1 ? "membre" : "membres"}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">
                {groupBirthdays.length} {groupBirthdays.length === 1 ? "anniversaire" : "anniversaires"}
              </span>
            </div>
          </CardFooter>
        </Card>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="members">Membres</TabsTrigger>
            <TabsTrigger value="birthdays">Anniversaires</TabsTrigger>
          </TabsList>
          
          <TabsContent value="members">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Membres du groupe</h2>
              {hasEditPermission && (
                <Button size="sm" onClick={() => setIsInviteMemberOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Inviter
                </Button>
              )}
            </div>
            
            {isLoadingGroupMembers ? (
              <div className="text-center py-10">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-500">Chargement des membres...</p>
              </div>
            ) : groupMembers.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {groupMembers.map((member) => (
                    <li key={member.id}>
                      <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 bg-blue-500 text-white">
                            <AvatarFallback>
                              {member.userId === user?.id ? getUserInitials(user.username) : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.userId === user?.id ? user.username : `Utilisateur #${member.userId}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.userId === user?.id ? "Vous" : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {member.isLeader && (
                            <Badge className="mr-2 bg-blue-100 text-blue-800">
                              Chef de groupe
                            </Badge>
                          )}
                          {hasEditPermission && member.userId !== user?.id && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveMember(member.userId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
                <p className="text-gray-500">Ce groupe n'a pas encore de membres.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="birthdays">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Anniversaires du groupe</h2>
              <Button size="sm" onClick={() => setLocation("/birthdays")}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>
            
            {isLoadingGroupBirthdays ? (
              <div className="text-center py-10">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-500">Chargement des anniversaires...</p>
              </div>
            ) : groupBirthdays.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {groupBirthdays.map((birthday) => (
                    <li key={birthday.id}>
                      <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <span className="text-sm font-medium">
                              {new Date(birthday.birthDate).getDate()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{birthday.name}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(birthday.birthDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocation(`/birthdays?edit=${birthday.id}`)}
                        >
                          Voir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
                <p className="text-gray-500">
                  Ce groupe n'a pas encore d'anniversaires.
                </p>
                <Button 
                  onClick={() => setLocation("/birthdays")} 
                  className="mt-4"
                >
                  Ajouter un anniversaire
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </>
    );
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="lg:pl-64 flex flex-col flex-1">
        <MobileSidebar />
        
        <main className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {selectedGroup ? renderGroupDetails() : renderGroupList()}
          </div>
        </main>
      </div>
      
      {/* Group Form Dialog */}
      <GroupForm
        open={isCreateGroupOpen || !!editingGroup}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateGroupOpen(false);
            setEditingGroup(undefined);
          }
        }}
        onSubmit={editingGroup ? handleUpdateSubmit : handleCreateSubmit}
        initialData={editingGroup}
        isSubmitting={createGroupMutation.isPending || updateGroupMutation.isPending}
      />
      
      {/* Delete Group Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce groupe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les anniversaires associés à ce groupe seront également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteGroup}
              disabled={deleteGroupMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteGroupMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Join Group Dialog */}
      <Dialog open={isJoinGroupOpen} onOpenChange={setIsJoinGroupOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rejoindre un groupe</DialogTitle>
            <DialogDescription>
              Entrez l'identifiant du groupe et le mot de passe si nécessaire.
            </DialogDescription>
          </DialogHeader>
          <Form {...joinGroupForm}>
            <form onSubmit={joinGroupForm.handleSubmit(handleJoinGroupSubmit)} className="space-y-4 py-4">
              <FormField
                control={joinGroupForm.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identifiant du groupe</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Ex: 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={joinGroupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe (si nécessaire)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mot de passe du groupe" {...field} />
                    </FormControl>
                    <FormDescription>
                      Laissez vide si le groupe n'est pas protégé par un mot de passe.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsJoinGroupOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={joinGroupMutation.isPending}>
                  {joinGroupMutation.isPending ? "Traitement..." : "Rejoindre"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Invite Member Dialog */}
      <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Inviter un membre</DialogTitle>
            <DialogDescription>
              Entrez l'adresse email de la personne que vous souhaitez inviter.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteMemberForm}>
            <form onSubmit={inviteMemberForm.handleSubmit(handleInviteMemberSubmit)} className="space-y-4 py-4">
              <FormField
                control={inviteMemberForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="exemple@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteMemberForm.control}
                name="isLeader"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Chef de groupe</FormLabel>
                      <FormDescription>
                        Cette personne pourra gérer les membres et les paramètres du groupe.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteMemberOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={getUserByEmailMutation.isPending}>
                  {getUserByEmailMutation.isPending ? "Traitement..." : "Inviter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
