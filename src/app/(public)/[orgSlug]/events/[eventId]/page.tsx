"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Video, Users, Loader2, CheckCircle, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number | null;
  _count: { registrations: number };
}

interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: "IN_PERSON" | "VIRTUAL" | "HYBRID";
  startDate: string;
  endDate: string | null;
  location: string | null;
  virtualUrl: string | null;
  maxCapacity: number | null;
  isPublished: boolean;
  ticketTypes: TicketType[];
  _count: { registrations: number };
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
}

type PageState = "detail" | "register" | "submitting" | "success" | "error";

const TYPE_LABELS = {
  IN_PERSON: "In Person",
  VIRTUAL: "Virtual",
  HYBRID: "Hybrid",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PublicEventDetailPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const orgSlug = params.orgSlug ?? "";
  const eventId = params.eventId ?? "";

  const [org, setOrg] = useState<OrgData | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>("detail");

  // Registration form
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [orgRes, eventRes] = await Promise.all([
          fetch(`/api/public/orgs/${orgSlug}`),
          fetch(`/api/public/orgs/${orgSlug}/events/${eventId}`),
        ]);

        if (orgRes.ok) {
          const orgJson = await orgRes.json() as { success: boolean; data: OrgData | null };
          setOrg(orgJson.data);
        }

        if (!eventRes.ok) {
          setError("Event not found");
          return;
        }

        const eventJson = await eventRes.json() as { success: boolean; data: EventDetail | null; error?: { message: string } };
        if (!eventJson.success || !eventJson.data) {
          setError(eventJson.error?.message ?? "Event not found");
          return;
        }
        setEvent(eventJson.data);

        // Pre-select first ticket type if available
        if (eventJson.data.ticketTypes.length > 0) {
          setSelectedTicketId(eventJson.data.ticketTypes[0].id);
        }
      } catch {
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgSlug, eventId]);

  const spotsLeft = event?.maxCapacity
    ? event.maxCapacity - event._count.registrations
    : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!attendeeName.trim()) errs.name = "Your name is required";
    if (!attendeeEmail.trim()) errs.email = "Your email is required";
    else if (!/\S+@\S+\.\S+/.test(attendeeEmail)) errs.email = "Enter a valid email address";
    if (event?.ticketTypes.length && !selectedTicketId) errs.ticket = "Select a ticket type";
    return Object.keys(errs).length === 0 ? true : (setFormErrors(errs), false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setPageState("submitting");
    setServerError(null);

    try {
      const body: Record<string, unknown> = {
        attendeeName: attendeeName.trim(),
        attendeeEmail: attendeeEmail.trim(),
        quantity,
      };
      if (selectedTicketId) body.ticketTypeId = selectedTicketId;

      const res = await fetch(`/api/public/orgs/${orgSlug}/events/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json() as { success: boolean; error?: { code: string; message: string } };

      if (!json.success) {
        setServerError(json.error?.message ?? "Registration failed. Please try again.");
        setPageState("register");
        return;
      }

      setPageState("success");
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
      setPageState("register");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading event...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-lg font-medium text-foreground">Event Not Found</p>
        <p className="text-sm text-muted-foreground">{error ?? "This event doesn't exist or is no longer available."}</p>
        <Link href={`/${orgSlug}/events`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  // Success state
  if (pageState === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">You&apos;re registered!</h1>
          <p className="text-muted-foreground mb-2">
            We&apos;ve confirmed your spot for <strong>{event.title}</strong>.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            A confirmation will be sent to <strong>{attendeeEmail}</strong>.
          </p>
          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-left space-y-2 mb-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.startDate)} at {formatTime(event.startDate)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
            {event.virtualUrl && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Video className="h-4 w-4" />
                <span>Virtual event link will be emailed to you</span>
              </div>
            )}
          </div>
          <Link href={`/${orgSlug}/events`}>
            <Button variant="outline" className="w-full">View More Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link
        href={`/${orgSlug}/events`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All Events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event Details */}
        <div className="lg:col-span-2">
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {event.type === "IN_PERSON" ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : event.type === "VIRTUAL" ? (
                <Video className="h-3.5 w-3.5" />
              ) : (
                <Users className="h-3.5 w-3.5" />
              )}
              {TYPE_LABELS[event.type]}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4">{event.title}</h1>

          {/* Date and location */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                {formatDate(event.startDate)} at {formatTime(event.startDate)}
                {event.endDate && ` – ${formatTime(event.endDate)}`}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
            {event.virtualUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4 shrink-0" />
                <span>Virtual event — link provided upon registration</span>
              </div>
            )}
            {spotsLeft !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className={isFull ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {isFull
                    ? "This event is at capacity"
                    : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} remaining`}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="prose prose-sm max-w-none text-foreground">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}

          {/* Ticket types */}
          {event.ticketTypes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Tickets
              </h2>
              <div className="space-y-3">
                {event.ticketTypes.map((tt) => {
                  const ttSpotsLeft = tt.capacity
                    ? tt.capacity - tt._count.registrations
                    : null;
                  const ttFull = ttSpotsLeft !== null && ttSpotsLeft <= 0;
                  return (
                    <div
                      key={tt.id}
                      className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
                        ttFull ? "opacity-50" : "hover:border-primary/40 transition-colors"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">{tt.name}</p>
                        {tt.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{tt.description}</p>
                        )}
                        {ttSpotsLeft !== null && (
                          <p className={`text-xs mt-1 ${ttFull ? "text-destructive" : "text-muted-foreground"}`}>
                            {ttFull ? "Sold out" : `${ttSpotsLeft} remaining`}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-foreground shrink-0">
                        {tt.price === 0
                          ? "Free"
                          : new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(tt.price)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Registration Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Register for this Event</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {isFull ? (
                  <div className="text-center py-4">
                    <p className="text-sm font-medium text-foreground">This event is full</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No spots are available at this time.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    {serverError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                        {serverError}
                      </div>
                    )}

                    {/* Ticket type selection */}
                    {event.ticketTypes.length > 1 && (
                      <div className="space-y-1.5">
                        <Label htmlFor="ticket">Ticket Type</Label>
                        <select
                          id="ticket"
                          value={selectedTicketId}
                          onChange={(e) => {
                            setSelectedTicketId(e.target.value);
                            setFormErrors((prev) => { const n = { ...prev }; delete n.ticket; return n; });
                          }}
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                        >
                          <option value="">Select a ticket</option>
                          {event.ticketTypes.map((tt) => (
                            <option key={tt.id} value={tt.id}>
                              {tt.name} — {tt.price === 0 ? "Free" : `$${tt.price}`}
                            </option>
                          ))}
                        </select>
                        {formErrors.ticket && (
                          <p className="text-xs text-destructive">{formErrors.ticket}</p>
                        )}
                      </div>
                    )}

                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <Label htmlFor="quantity">Quantity</Label>
                      <select
                        id="quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={attendeeName}
                        onChange={(e) => {
                          setAttendeeName(e.target.value);
                          setFormErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
                        }}
                        placeholder="Jane Smith"
                        aria-invalid={!!formErrors.name}
                      />
                      {formErrors.name && (
                        <p className="text-xs text-destructive">{formErrors.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={attendeeEmail}
                        onChange={(e) => {
                          setAttendeeEmail(e.target.value);
                          setFormErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
                        }}
                        placeholder="jane@example.com"
                        aria-invalid={!!formErrors.email}
                      />
                      {formErrors.email && (
                        <p className="text-xs text-destructive">{formErrors.email}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={pageState === "submitting"}
                    >
                      {pageState === "submitting" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Register Now"
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      No payment required — we&apos;ll confirm your spot by email.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>

            {org && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Hosted by {org.name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
