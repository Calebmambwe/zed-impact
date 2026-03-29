"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";

interface OrgMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-800",
  ADMIN: "bg-blue-100 text-blue-800",
  MANAGER: "bg-emerald-100 text-emerald-800",
  STAFF: "bg-purple-100 text-purple-800",
  VIEWER: "bg-muted text-muted-foreground",
};

export default function UsersPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug) return;
    fetch(`/api/public/orgs/${orgSlug}`)
      .then((r) => r.json())
      .then((json: { data?: { id?: string } }) => {
        const id = json.data?.id;
        if (id) {
          setOrgId(id);
          return fetch(`/api/orgs/${id}/members`);
        }
        throw new Error("Org not found");
      })
      .then((r) => r?.json())
      .then((json: { data?: OrgMember[] }) => {
        setMembers(json.data ?? []);
      })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Users</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage team members and their roles
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Team members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive py-4">{error}</p>
          )}
          {!loading && !error && members.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No team members yet</p>
            </div>
          )}
          {!loading && !error && members.length > 0 && (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {getInitials(member.user.name, member.user.email)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.user.name ?? member.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ROLE_COLORS[member.role] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
