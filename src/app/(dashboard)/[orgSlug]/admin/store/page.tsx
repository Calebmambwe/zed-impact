"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, Plus, Package, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProductVariant {
  id: string;
  name: string;
  inventory: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  isPublished: boolean;
  createdAt: string;
  variants: ProductVariant[];
}

interface ProductsResponse {
  success: boolean;
  data: Product[] | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function StorePage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/store/products?page=${page}&limit=20`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      const json = await res.json() as ProductsResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Failed to load products");
        return;
      }
      setProducts(json.data);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load products");
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
      fetchProducts(id);
    });
  }, [orgSlug, fetchProducts]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage products and view orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/admin/store/orders`}>
            <Button variant="outline">
              <ShoppingBag className="h-4 w-4" />
              Orders
            </Button>
          </Link>
          <Link href={`/${orgSlug}/admin/store/products/new`}>
            <Button>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading products...
        </div>
      )}
      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}
      {!loading && !error && products.length === 0 && (
        <div className="py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">No products yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Add your first product to start selling.
          </p>
          <Link href={`/${orgSlug}/admin/store/products/new`}>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          </Link>
        </div>
      )}
      {!loading && !error && products.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                {/* Product image placeholder */}
                <div className="aspect-square bg-muted/50 flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <CardContent className="pt-3 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
                        p.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.isPublished ? "Live" : "Draft"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-bold text-foreground">
                      {formatPrice(p.price, p.currency)}
                    </p>
                    {p.variants.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {meta && meta.total > meta.limit && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.page <= 1}
                  onClick={() => orgId && fetchProducts(orgId, meta.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                  onClick={() => orgId && fetchProducts(orgId, meta.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
