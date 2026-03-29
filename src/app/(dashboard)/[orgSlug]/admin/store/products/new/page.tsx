"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Variant {
  name: string;
  sku: string;
  price: string;
  inventory: string;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  price: string;
  isPublished: boolean;
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export default function NewProductPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    description: "",
    price: "",
    isPublished: false,
  });

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/public/orgs/${orgSlug}`);
      if (!res.ok) return;
      const json = await res.json() as { success: boolean; data: { id: string } | null };
      if (json.data?.id) setOrgId(json.data.id);
    }
    init();
  }, [orgSlug]);

  function update(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" && typeof value === "string" && prev.slug === nameToSlug(prev.name)
        ? { slug: nameToSlug(value) }
        : {}),
    }));
    if (typeof value === "string") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function addVariant() {
    setVariants((prev) => [...prev, { name: "", sku: "", price: "", inventory: "0" }]);
  }

  function updateVariant(index: number, field: keyof Variant, value: string) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Product name is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      errs.slug = "Slug must be lowercase alphanumeric with hyphens";
    if (!form.price) errs.price = "Price is required";
    else {
      const p = parseFloat(form.price);
      if (isNaN(p) || p < 0) errs.price = "Price must be a non-negative number";
    }
    return Object.keys(errs).length === 0 ? true : (setErrors(errs), false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !validate()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch(`/api/orgs/${orgId}/store/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          price: parseFloat(form.price),
          isPublished: form.isPublished,
          variants: variants.length > 0
            ? variants
                .filter((v) => v.name.trim())
                .map((v) => ({
                  name: v.name.trim(),
                  sku: v.sku.trim() || undefined,
                  price: v.price ? parseFloat(v.price) : undefined,
                  inventory: v.inventory ? parseInt(v.inventory) : 0,
                }))
            : undefined,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { code: string; message: string } };
      if (!json.success) {
        if (json.error?.code === "CONFLICT") {
          setErrors({ slug: "This slug is already taken. Choose another." });
        } else {
          setServerError(json.error?.message ?? "Failed to create product");
        }
        return;
      }

      router.push(`/${orgSlug}/admin/store`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/store`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Product</h1>
          <p className="text-sm text-muted-foreground">
            Create a new product for your store
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Product Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="ZedImpact T-Shirt"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center">
                <span className="inline-flex h-9 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  /store/
                </span>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value.toLowerCase())}
                  placeholder="zedimpact-t-shirt"
                  aria-invalid={!!errors.slug}
                  className="rounded-l-none"
                />
              </div>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label htmlFor="price">Base Price (USD)</Label>
              <div className="flex items-center">
                <span className="inline-flex h-9 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="25.00"
                  aria-invalid={!!errors.price}
                  className="rounded-l-none"
                />
              </div>
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe your product..."
                rows={3}
              />
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-2">
              <input
                id="isPublished"
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => update("isPublished", e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="isPublished" className="cursor-pointer text-sm">
                Publish product immediately
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Variants (optional)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="h-3.5 w-3.5" />
              Add Variant
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {variants.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Add variants for different sizes, colors, or configurations.
              </p>
            ) : (
              <div className="space-y-4">
                {variants.map((v, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        Variant {i + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(i)}
                        className="text-destructive hover:text-destructive h-6 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`v-name-${i}`} className="text-xs">Name</Label>
                        <Input
                          id={`v-name-${i}`}
                          value={v.name}
                          onChange={(e) => updateVariant(i, "name", e.target.value)}
                          placeholder="Small"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`v-sku-${i}`} className="text-xs">SKU (optional)</Label>
                        <Input
                          id={`v-sku-${i}`}
                          value={v.sku}
                          onChange={(e) => updateVariant(i, "sku", e.target.value)}
                          placeholder="SHIRT-SM"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`v-price-${i}`} className="text-xs">Price override (optional)</Label>
                        <Input
                          id={`v-price-${i}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.price}
                          onChange={(e) => updateVariant(i, "price", e.target.value)}
                          placeholder="Same as base"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`v-inv-${i}`} className="text-xs">Inventory</Label>
                        <Input
                          id={`v-inv-${i}`}
                          type="number"
                          min="0"
                          step="1"
                          value={v.inventory}
                          onChange={(e) => updateVariant(i, "inventory", e.target.value)}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting || !orgId}>
            {submitting ? "Saving..." : "Add Product"}
          </Button>
          <Link href={`/${orgSlug}/admin/store`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
