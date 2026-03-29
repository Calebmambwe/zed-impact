"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Trash2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

type MemberRole = "ADMIN" | "STAFF" | "VIEWER";

interface OrgMember {
  id: string;
  userId: string;
  role: MemberRole;
  email: string;
  name: string | null;
  joinedAt: string;
}

const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "Admin",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

const ROLE_BADGE_STYLES: Record<MemberRole, string> = {
  ADMIN: "bg-primary/10 text-primary border-0",
  STAFF: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0",
  VIEWER: "bg-muted text-muted-foreground border-0",
};

export default function TeamSettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("STAFF");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!orgSlug) return;
    fetch(`/api/orgs/${orgSlug}/settings/team`)
      .then((r) => r.json())
      .then((json: { data?: OrgMember[] }) => setMembers(json.data ?? []))
      .catch(() => toast.error("Failed to load team members"))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/settings/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
      } else {
        const json: { error?: string } = await res.json();
        toast.error(json.error ?? "Failed to send invitation");
      }
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await fetch(`/api/orgs/${orgSlug}/settings/team/${memberId}`, {
        method: "DELETE",
      });
      setMembers((m) => m.filter((member) => member.id !== memberId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Team</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage team members and their access levels.
      </p>

      {/* Invite form */}
      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="size-4" />
            Invite a team member
          </CardTitle>
          <CardDescription>
            They&#39;ll receive an email invitation to join your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="inviteEmail" className="sr-only">
                Email address
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@yourorg.org"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled={inviting}
            >
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 size-4" />
                  Invite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Member list */}
      <div className="max-w-2xl space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed p-10 text-center">
            <Users className="mx-auto mb-3 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No team members yet. Invite someone above.
            </p>
          </div>
        ) : (
          members.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* Avatar placeholder */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {(member.name ?? member.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.name ?? member.email}
                    </p>
                    <Badge className={ROLE_BADGE_STYLES[member.role] + " text-xs"}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </div>
                  {member.name && (
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(member.id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Remove</span>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
