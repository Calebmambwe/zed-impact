"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from "lucide-react";

export default function VolunteersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Volunteers</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your volunteer roster
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Volunteer list</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <UserCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No volunteers yet</p>
            <p className="text-xs text-muted-foreground">
              Volunteers who sign up through the donor portal will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
