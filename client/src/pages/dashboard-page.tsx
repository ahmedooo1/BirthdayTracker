import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Birthday, Group } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BirthdayList } from "@/components/birthday/birthday-list";
import { BirthdayForm, BirthdayFormData } from "@/components/birthday/birthday-form";
import { GroupCard } from "@/components/group/group-card";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
  const [isAddBirthdayOpen, setIsAddBirthdayOpen] = useState(false);
  
  // Fetch stats data
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });
  
  // Fetch upcoming birthdays
  const { data: upcomingBirthdays = [] } = useQuery<Birthday[]>({
    queryKey: ["/api/birthdays", { upcoming: 30 }],
  });
  
  // Fetch user's groups
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });
  
  // Add birthday mutation
  const addBirthdayMutation = useMutation({
    mutationFn: async (data: BirthdayFormData) => {
      const res = await apiRequest("POST", "/api/birthdays", data);
      return await res.json();
    },
    onSuccess: () => {
      setIsAddBirthdayOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Anniversaire ajouté",
        description: "L'anniversaire a été ajouté avec succès.",
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
  
  // Update birthday mutation
  const updateBirthdayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BirthdayFormData }) => {
      const res = await apiRequest("PATCH", `/api/birthdays/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
      toast({
        title: "Anniversaire mis à jour",
        description: "L'anniversaire a été mis à jour avec succès.",
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
  
  // Delete birthday mutation
  const deleteBirthdayMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/birthdays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Anniversaire supprimé",
        description: "L'anniversaire a été supprimé avec succès.",
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
  
  // Filter birthdays based on search query
  const filteredBirthdays = upcomingBirthdays.filter(birthday => {
    if (!searchQuery) return true;
    return birthday.name.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  const handleAddBirthday = (data: BirthdayFormData) => {
    addBirthdayMutation.mutate(data);
  };
  
  const handleEditBirthday = (birthday: Birthday) => {
    navigate(`/birthdays?edit=${birthday.id}`);
  };
  
  const handleDeleteBirthday = (id: number) => {
    deleteBirthdayMutation.mutate(id);
  };
  
  const handleViewGroupDetails = (group: Group) => {
    navigate(`/groups?id=${group.id}`);
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
                <h1 className="text-2xl font-semibold text-gray-800">Tableau de bord</h1>
                <p className="mt-1 text-sm text-gray-500">Bienvenue dans votre gestionnaire d'anniversaires</p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button 
                  onClick={() => setIsAddBirthdayOpen(true)}
                  className="inline-flex items-center"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Ajouter un anniversaire
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Total Birthdays */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Anniversaires au total</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {stats?.totalBirthdays || 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Groups */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-violet-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Groupes</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {stats?.totalGroups || 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Birthdays */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-rose-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Anniversaires ce mois-ci</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {stats?.upcomingBirthdays || 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-8 mb-6">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    className="block w-full pl-10 pr-12"
                    placeholder="Rechercher un anniversaire..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                    <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                      <SelectTrigger className="border-0 w-[180px]">
                        <SelectValue placeholder="Tous les groupes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les groupes</SelectItem>
                        {groups.map(group => (
                          <SelectItem key={group.id} value={String(group.id)}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Birthdays */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Anniversaires à venir</h2>
              <BirthdayList 
                birthdays={filteredBirthdays}
                onEdit={handleEditBirthday}
                onDelete={handleDeleteBirthday}
                isDeleting={deleteBirthdayMutation.isPending}
              />
            </div>

            {/* Group Preview */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Vos groupes</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {groups.slice(0, 3).map(group => (
                  <GroupCard 
                    key={group.id}
                    group={group}
                    onViewDetails={handleViewGroupDetails}
                  />
                ))}
                {groups.length === 0 && (
                  <div className="col-span-3 text-center py-10 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Aucun groupe trouvé. Créez un nouveau groupe pour commencer.</p>
                    <Button onClick={() => navigate("/groups")} className="mt-4">
                      Créer un groupe
                    </Button>
                  </div>
                )}
              </div>
              {groups.length > 3 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => navigate("/groups")}>
                    Voir tous les groupes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      <BirthdayForm
        open={isAddBirthdayOpen}
        onOpenChange={setIsAddBirthdayOpen}
        onSubmit={handleAddBirthday}
        isSubmitting={addBirthdayMutation.isPending}
      />
    </div>
  );
}
