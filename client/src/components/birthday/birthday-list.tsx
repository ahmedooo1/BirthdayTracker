import { useState } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Birthday, Group } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface BirthdayListProps {
  birthdays: Birthday[];
  onEdit: (birthday: Birthday) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export function BirthdayList({ birthdays, onEdit, onDelete, isDeleting }: BirthdayListProps) {
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Fetch groups for group name display
  const { data: groups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });
  
  const getGroupName = (groupId: number) => {
    const group = groups?.find(g => g.id === groupId);
    return group?.name || "Groupe inconnu";
  };
  
  const getGroupBadgeColor = (groupName: string) => {
    // Map group names to TailwindCSS colors
    const colorMap: Record<string, string> = {
      "Famille": "bg-violet-100 text-violet-800",
      "Amis": "bg-green-100 text-green-800",
      "Collègues": "bg-yellow-100 text-yellow-800",
    };
    
    return colorMap[groupName] || "bg-blue-100 text-blue-800";
  };
  
  const getDayOfMonth = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.getDate();
  };
  
  const formatBirthdayDate = (dateString: string | Date) => {
    const birthDate = new Date(dateString);
    const today = new Date();
    
    // Create dates for this year's birthday
    const thisYearBirthday = new Date(
      today.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate()
    );
    
    // If birthday has passed this year, use next year's date
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
    }
    
    const daysUntilBirthday = differenceInDays(thisYearBirthday, today);
    let displayText = format(birthDate, "d MMMM", { locale: fr });
    
    if (daysUntilBirthday === 0) {
      displayText += " (aujourd'hui)";
    } else if (daysUntilBirthday === 1) {
      displayText += " (demain)";
    } else {
      displayText += ` (dans ${daysUntilBirthday} jours)`;
    }
    
    return displayText;
  };
  
  const handleDeleteClick = (birthday: Birthday) => {
    setSelectedBirthday(birthday);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedBirthday) {
      onDelete(selectedBirthday.id);
    }
    setIsDeleteDialogOpen(false);
  };
  
  if (birthdays.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
        <p className="text-gray-500">Aucun anniversaire trouvé</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {birthdays.map((birthday) => {
            const groupName = getGroupName(birthday.groupId);
            const badgeClass = getGroupBadgeColor(groupName);
            
            return (
              <li key={birthday.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <span className="text-sm font-medium">{getDayOfMonth(birthday.birthDate)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{birthday.name}</div>
                        <div className="text-sm text-gray-500">{formatBirthdayDate(birthday.birthDate)}</div>
                        {birthday.notes && (
                          <div className="text-xs text-gray-500 mt-1">{birthday.notes}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Badge className={badgeClass}>{groupName}</Badge>
                      <div className="ml-2 flex-shrink-0 flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(birthday)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(birthday)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet anniversaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'anniversaire de {selectedBirthday?.name} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
