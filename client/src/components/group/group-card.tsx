import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Group } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface GroupCardProps {
  group: Group;
  onViewDetails: (group: Group) => void;
}

export function GroupCard({ group, onViewDetails }: GroupCardProps) {
  // Fetch birthdays for this group to count them
  const { data: birthdays = [] } = useQuery({
    queryKey: ["/api/birthdays", { groupId: group.id }],
  });
  
  // Fetch members for this group to count them
  const { data: members = [] } = useQuery({
    queryKey: ["/api/groups", group.id, "members"],
  });
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
          <Badge className="px-2 py-1 text-xs bg-blue-100 text-blue-800">
            {members.length} {members.length === 1 ? "membre" : "membres"}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {group.description || `Groupe ${group.name}`}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between px-4 py-3 bg-gray-50">
        <Button 
          variant="link" 
          className="text-sm text-blue-600 hover:text-blue-800 p-0"
          onClick={() => onViewDetails(group)}
        >
          Voir plus
        </Button>
        <span className="text-sm text-gray-500">
          {birthdays.length} {birthdays.length === 1 ? "anniversaire" : "anniversaires"}
        </span>
      </CardFooter>
    </Card>
  );
}
