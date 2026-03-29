"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Video, Users, Loader2, CalendarX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: "IN_PERSON" | "VIRTUAL" | "HYBRID";
  startDate: string;
  endDate: string | null;
  location: string | null;
  virtualUrl: string | null;
  isPublished: boolean;
  maxCapacity: number | null;
  _count: { registrations: number };
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
}

interface EventsResponse {
  success: boolean;
  data: Event[] | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

const TYPE_ICONS = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Users,
};

const TYPE_LABELS = {
  IN_PERSON: "In Person",
  VIRTUAL: "Virtual",
  HYBRID: "Hybrid",
};

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function PublicEventsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [org, setOrg] = useState<OrgData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [orgRes, eventsRes] = await Promise.all([
          fetch(`/api/public/orgs/${orgSlug}`),
          fetch(`/api/public/orgs/${orgSlug}/events?limit=50`),
        ]);

        if (orgRes.ok) {
          const orgJson = await orgRes.json() as { success: boolean; data: OrgData | null };
          setOrg(orgJson.data);
        }

        if (!eventsRes.ok) {
          setError("Failed to load events");
          return;
        }

        const eventsJson = await eventsRes.json() as EventsResponse;
        if (!eventsJson.success || !eventsJson.data) {
          setError(eventsJson.error?.message ?? "Failed to load events");
          return;
        }
        setEvents(eventsJson.data);
      } catch {
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgSlug]);

  const upcomingEvents = events.filter((e) => new Date(e.startDate) >= new Date());
  const pastEvents = events.filter((e) => new Date(e.startDate) < new Date());

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        {org && (
          <p className="text-sm text-muted-foreground mb-1">{org.name}</p>
        )}
        <h1 className="text-3xl font-bold text-foreground">Events</h1>
        <p className="text-muted-foreground mt-1">
          Join us for upcoming events and make a difference together.
        </p>
      </div>

      {loading && (
        <div className="py-24 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading events...
        </div>
      )}

      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="py-20 text-center">
          <CalendarX className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No upcoming events</p>
          <p className="text-sm text-muted-foreground mt-1">
            Check back soon for new events from {org?.name ?? "this organization"}.
          </p>
        </div>
      )}

      {!loading && !error && upcomingEvents.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {upcomingEvents.map((event) => {
              const TypeIcon = TYPE_ICONS[event.type];
              const spotsLeft = event.maxCapacity
                ? event.maxCapacity - event._count.registrations
                : null;
              const isFull = spotsLeft !== null && spotsLeft <= 0;

              return (
                <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Date block */}
                      <div className="sm:w-28 bg-primary/10 flex flex-col items-center justify-center py-4 px-3 shrink-0">
                        <span className="text-xs font-medium text-primary uppercase tracking-wide">
                          {new Date(event.startDate).toLocaleString("en-US", { month: "short" })}
                        </span>
                        <span className="text-3xl font-bold text-primary leading-none">
                          {new Date(event.startDate).getDate()}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {new Date(event.startDate).getFullYear()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {TYPE_LABELS[event.type]}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-foreground leading-snug">
                            {event.title}
                          </h3>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatEventTime(event.startDate)}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                            {spotsLeft !== null && (
                              <span className={isFull ? "text-destructive font-medium" : ""}>
                                {isFull ? "Full" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isFull ? (
                            <Button size="sm" variant="outline" disabled>
                              Full
                            </Button>
                          ) : (
                            <Link href={`/${orgSlug}/events/${event.slug}`}>
                              <Button size="sm">Register</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {!loading && !error && pastEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 text-muted-foreground">
            Past Events
          </h2>
          <div className="space-y-3">
            {pastEvents.map((event) => {
              const TypeIcon = TYPE_ICONS[event.type];
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20"
                >
                  <div className="shrink-0 text-center w-12">
                    <div className="text-xs text-muted-foreground uppercase">
                      {new Date(event.startDate).toLocaleString("en-US", { month: "short" })}
                    </div>
                    <div className="text-lg font-bold text-muted-foreground">
                      {new Date(event.startDate).getDate()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{event.title}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/60 mt-0.5">
                      <TypeIcon className="h-3 w-3" />
                      <span>{TYPE_LABELS[event.type]}</span>
                      {event.location && (
                        <>
                          <span>·</span>
                          <span>{event.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground/60 shrink-0">
                    {event._count.registrations} attended
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
