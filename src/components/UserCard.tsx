import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {user.role}
        </span>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(user.id)}>
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(user.id)}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
