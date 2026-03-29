"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Plus,
  MapPin,
  Video,
  Users,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  title: string;
  slug: string;
  type: "IN_PERSON" | "VIRTUAL" | "HYBRID";
  location: string | null;
  startDate: string;
  endDate: string | null;
  isPublished: boolean;
  maxCapacity: number | null;
  _count: { registrations: number };
}

interface EventsResponse {
  success: boolean;
  data: Event[] | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function typeBadge(type: string) {
  const map: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    IN_PERSON: { label: "In Person", icon: MapPin, cls: "bg-green-100 text-green-700" },
    VIRTUAL: { label: "Virtual", icon: Video, cls: "bg-blue-100 text-blue-700" },
    HYBRID: { label: "Hybrid", icon: Users, cls: "bg-purple-100 text-purple-700" },
  };
  const m = map[type] ?? { label: type, icon: Calendar, cls: "bg-muted text-muted-foreground" };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

export default function EventsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/events?page=${page}&limit=20`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      const json = await res.json() as EventsResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Failed to load events");
        return;
      }
      setEvents(json.data);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, router]);

  useEffect(() => {
    resolveOrgId(orgSlug).then((id) => {
      if (!id) {
        setError("Organization not found");
        setLoading(false);
        return;
      }
      setOrgId(id);
      fetchEvents(id);
    });
  }, [orgSlug, fetchEvents]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your organization&apos;s events and attendees
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/events/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            All Events
            {meta && (
              <span className="text-muted-foreground font-normal">
                ({meta.total.toLocaleString()} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading events...
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && events.length === 0 && (
            <div className="py-16 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No events yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first event to start accepting registrations.
              </p>
              <Link href={`/${orgSlug}/admin/events/new`} className="mt-4 inline-block">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New Event
                </Button>
              </Link>
            </div>
          )}
          {!loading && !error && events.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Capacity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{ev.title}</div>
                        {ev.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {ev.location}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{typeBadge(ev.type)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                        {new Date(ev.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {ev._count.registrations}
                        {ev.maxCapacity ? ` / ${ev.maxCapacity}` : " registered"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            ev.isPublished
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {ev.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/${orgSlug}/admin/events/${ev.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {meta && meta.total > meta.limit && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page <= 1}
                      onClick={() => orgId && fetchEvents(orgId, meta.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                      onClick={() => orgId && fetchEvents(orgId, meta.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
