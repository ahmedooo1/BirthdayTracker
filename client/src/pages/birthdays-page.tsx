import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Birthday, Group } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BirthdayList } from "@/components/birthday/birthday-list";
import { BirthdayForm, BirthdayFormData } from "@/components/birthday/birthday-form";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BirthdaysPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const editBirthdayId = params.get("edit");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
  const [isAddBirthdayOpen, setIsAddBirthdayOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | undefined>(undefined);
  
  // Fetch all birthdays
  const { data: birthdays = [] } = useQuery<Birthday[]>({
    queryKey: ["/api/birthdays"],
  });
  
  // Fetch user's groups
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });
  
  // If editBirthdayId is present in URL, fetch that birthday
  useEffect(() => {
    if (editBirthdayId) {
      const birthdayId = parseInt(editBirthdayId);
      const birthday = birthdays.find(b => b.id === birthdayId);
      
      if (birthday) {
        setEditingBirthday(birthday);
        setIsAddBirthdayOpen(true);
      } else {
        // If birthday not found, could fetch it specifically
        queryClient.fetchQuery({
          queryKey: ["/api/birthdays", birthdayId],
          queryFn: async () => {
            const res = await fetch(`/api/birthdays/${birthdayId}`);
            return res.json();
          }
        }).then(data => {
          setEditingBirthday(data);
          setIsAddBirthdayOpen(true);
        }).catch(() => {
          toast({
            title: "Erreur",
            description: "Impossible de trouver cet anniversaire",
            variant: "destructive",
          });
          clearEditParam();
        });
      }
    }
  }, [editBirthdayId, birthdays, toast]);
  
  // Clear edit parameter from URL
  const clearEditParam = () => {
    const newParams = new URLSearchParams(search);
    newParams.delete("edit");
    setLocation(
      newParams.toString() ? `${location.split("?")[0]}?${newParams.toString()}` : location.split("?")[0],
      { replace: true }
    );
  };
  
  // Add birthday mutation
  const addBirthdayMutation = useMutation({
    mutationFn: async (data: BirthdayFormData) => {
      const res = await apiRequest("POST", "/api/birthdays", data);
      return await res.json();
    },
    onSuccess: () => {
      setIsAddBirthdayOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
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
      setIsAddBirthdayOpen(false);
      setEditingBirthday(undefined);
      clearEditParam();
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
  
  // Filter birthdays based on search query and group filter
  const filteredBirthdays = birthdays.filter(birthday => {
    // Apply text search filter
    const matchesSearch = searchQuery 
      ? birthday.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // Apply group filter
    const matchesGroup = selectedGroupFilter === "all" 
      ? true 
      : birthday.groupId === parseInt(selectedGroupFilter);
    
    return matchesSearch && matchesGroup;
  });
  
  const handleSubmit = (data: BirthdayFormData) => {
    if (editingBirthday) {
      updateBirthdayMutation.mutate({ id: editingBirthday.id, data });
    } else {
      addBirthdayMutation.mutate(data);
    }
  };
  
  const handleEditBirthday = (birthday: Birthday) => {
    setEditingBirthday(birthday);
    setIsAddBirthdayOpen(true);
    
    // Update URL
    const newParams = new URLSearchParams(search);
    newParams.set("edit", birthday.id.toString());
    setLocation(`${location.split("?")[0]}?${newParams.toString()}`, { replace: true });
  };
  
  const handleCloseForm = () => {
    setIsAddBirthdayOpen(false);
    setEditingBirthday(undefined);
    clearEditParam();
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
                <h1 className="text-2xl font-semibold text-gray-800">Anniversaires</h1>
                <p className="mt-1 text-sm text-gray-500">Gérez tous les anniversaires</p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button 
                  onClick={() => {
                    setEditingBirthday(undefined);
                    clearEditParam();
                    setIsAddBirthdayOpen(true);
                  }}
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Ajouter un anniversaire
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-9 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  className="pl-10 w-full"
                  placeholder="Rechercher un anniversaire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                  <SelectTrigger>
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

            {/* Birthday List */}
            <BirthdayList 
              birthdays={filteredBirthdays}
              onEdit={handleEditBirthday}
              onDelete={handleDeleteBirthday}
              isDeleting={deleteBirthdayMutation.isPending}
            />

            {filteredBirthdays.length === 0 && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
                <p className="text-gray-500">
                  {searchQuery || selectedGroupFilter !== "all" 
                    ? "Aucun anniversaire ne correspond à votre recherche" 
                    : "Aucun anniversaire trouvé. Ajoutez votre premier anniversaire."}
                </p>
                <Button 
                  onClick={() => {
                    setEditingBirthday(undefined);
                    setIsAddBirthdayOpen(true);
                  }} 
                  className="mt-4"
                >
                  Ajouter un anniversaire
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
      
      <BirthdayForm
        open={isAddBirthdayOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleSubmit}
        initialData={editingBirthday}
        isSubmitting={addBirthdayMutation.isPending || updateBirthdayMutation.isPending}
      />
    </div>
  );
}
