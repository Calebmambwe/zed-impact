"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Video,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number | null;
  sold: number;
}

interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: "IN_PERSON" | "VIRTUAL" | "HYBRID";
  location: string | null;
  virtualUrl: string | null;
  startDate: string;
  endDate: string | null;
  isPublished: boolean;
  maxCapacity: number | null;
  ticketTypes: TicketType[];
  _count: { registrations: number };
}

interface Attendee {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  quantity: number;
  totalPaid: number;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
  ticketType: { name: string } | null;
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

const TYPE_LABELS: Record<string, string> = {
  IN_PERSON: "In Person",
  VIRTUAL: "Virtual",
  HYBRID: "Hybrid",
};

export default function EventDetailPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const orgSlug = params.orgSlug ?? "";
  const eventId = params.eventId ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeMeta, setAttendeeMeta] = useState<{ total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const id = await resolveOrgId(orgSlug);
      if (!id) {
        setError("Organization not found");
        setLoading(false);
        return;
      }
      setOrgId(id);

      try {
        const [evRes, attRes] = await Promise.all([
          fetch(`/api/orgs/${id}/events/${eventId}`),
          fetch(`/api/orgs/${id}/events/${eventId}/attendees?limit=50`),
        ]);

        if (evRes.status === 401 || evRes.status === 403) {
          router.push(`/${orgSlug}/admin`);
          return;
        }

        const evJson = await evRes.json() as {
          success: boolean;
          data: EventDetail | null;
          error: { message: string } | null;
        };
        if (!evJson.success || !evJson.data) {
          setError(evJson.error?.message ?? "Event not found");
          setLoading(false);
          return;
        }
        setEvent(evJson.data);

        if (attRes.ok) {
          const attJson = await attRes.json() as {
            success: boolean;
            data: Attendee[] | null;
            meta?: { total: number };
          };
          if (attJson.success && attJson.data) {
            setAttendees(attJson.data);
            setAttendeeMeta(attJson.meta ?? null);
          }
        }
      } catch {
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgSlug, eventId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-destructive">{error ?? "Event not found"}</p>
        <Link href={`/${orgSlug}/admin/events`} className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/events`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{event.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {TYPE_LABELS[event.type] ?? event.type}
            {event.location && ` · ${event.location}`}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            event.isPublished
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {event.isPublished ? "Published" : "Draft"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm">Event Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-foreground font-medium">
                    {new Date(event.startDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs">
                    {new Date(event.startDate).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {event.endDate &&
                      ` – ${new Date(event.endDate).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-foreground">{event.location}</p>
                </div>
              )}

              {event.virtualUrl && (
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <Video className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <a
                    href={event.virtualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    Join Online
                  </a>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Users className="h-4 w-4 flex-shrink-0" />
                <p>
                  <span className="text-foreground font-medium">
                    {event._count.registrations}
                  </span>{" "}
                  {event.maxCapacity
                    ? `/ ${event.maxCapacity} registered`
                    : "registered"}
                </p>
              </div>
            </CardContent>
          </Card>

          {event.description && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </CardContent>
            </Card>
          )}

          {event.ticketTypes.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Ticket Types</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {event.ticketTypes.map((tt) => (
                  <div key={tt.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{tt.name}</p>
                      {tt.quantity && (
                        <p className="text-xs text-muted-foreground">
                          {tt.sold} / {tt.quantity} sold
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-foreground">
                      {tt.price === 0 ? "Free" : `$${tt.price}`}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Attendees list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Attendees
                {attendeeMeta && (
                  <span className="text-muted-foreground font-normal">
                    ({attendeeMeta.total.toLocaleString()} total)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {attendees.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No registrations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share the event page to start collecting registrations.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Attendee
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                          Ticket
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Check-in
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                          Registered
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {attendees.map((a) => (
                        <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{a.attendeeName}</div>
                            <div className="text-xs text-muted-foreground">{a.attendeeEmail}</div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                            {a.ticketType?.name ?? "General"}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                            {a.quantity}
                          </td>
                          <td className="px-4 py-3">
                            {a.checkedIn ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Checked in
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* suppress orgId unused warning */}
      {orgId && null}
    </div>
  );
}
