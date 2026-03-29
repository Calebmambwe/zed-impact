"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Package, ShoppingCart, X, Plus, Minus, Loader2, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProductVariant {
  id: string;
  name: string;
  inventory: number;
  price: number | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  isPublished: boolean;
  variants: ProductVariant[];
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
}

interface CartItem {
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
}

function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function PublicStorePage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [org, setOrg] = useState<OrgData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const [orgRes, productsRes] = await Promise.all([
          fetch(`/api/public/orgs/${orgSlug}`),
          fetch(`/api/public/orgs/${orgSlug}/store?limit=50`),
        ]);

        if (orgRes.ok) {
          const orgJson = await orgRes.json() as { success: boolean; data: OrgData | null };
          setOrg(orgJson.data);
        }

        if (!productsRes.ok) {
          setError("Failed to load store");
          return;
        }

        const productsJson = await productsRes.json() as {
          success: boolean;
          data: Product[] | null;
          error?: { message: string };
        };

        if (!productsJson.success || !productsJson.data) {
          setError(productsJson.error?.message ?? "Failed to load store");
          return;
        }
        setProducts(productsJson.data);
      } catch {
        setError("Failed to load store");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgSlug]);

  const addToCart = useCallback((product: Product) => {
    const variantId = selectedVariants[product.id];
    const variant = product.variants.find((v) => v.id === variantId) ?? null;

    setCart((prev) => {
      const key = `${product.id}-${variant?.id ?? "base"}`;
      const existing = prev.find(
        (item) => `${item.product.id}-${item.variant?.id ?? "base"}` === key
      );
      if (existing) {
        return prev.map((item) =>
          `${item.product.id}-${item.variant?.id ?? "base"}` === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
    setCartOpen(true);
  }, [selectedVariants]);

  function updateQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          const itemKey = `${item.product.id}-${item.variant?.id ?? "base"}`;
          return itemKey === key ? { ...item, quantity: item.quantity + delta } : item;
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter(
      (item) => `${item.product.id}-${item.variant?.id ?? "base"}` !== key
    ));
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => {
    const price = item.variant?.price ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          {org && <p className="text-sm text-muted-foreground mb-1">{org.name}</p>}
          <h1 className="text-3xl font-bold text-foreground">Store</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Support {org?.name ?? "us"} by purchasing our merchandise.
          </p>
        </div>
        <Button
          variant="outline"
          className="relative"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </Button>
      </div>

      {loading && (
        <div className="py-24 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading store...
        </div>
      )}

      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="py-20 text-center">
          <Store className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Store coming soon</p>
          <p className="text-sm text-muted-foreground mt-1">
            Products will appear here when they&apos;re available.
          </p>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const selectedVariantId = selectedVariants[product.id];
            const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
            const displayPrice = selectedVariant?.price ?? product.price;
            const isOutOfStock =
              selectedVariant ? selectedVariant.inventory === 0 : false;

            return (
              <Card key={product.id} className="overflow-hidden group">
                {/* Product image placeholder */}
                <div className="aspect-square bg-muted/50 flex items-center justify-center group-hover:bg-muted/70 transition-colors">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                </div>

                <CardContent className="pt-4 pb-5 space-y-3">
                  <div>
                    <p className="font-semibold text-foreground leading-snug">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <p className="text-xl font-bold text-foreground">
                    {formatPrice(displayPrice, product.currency)}
                  </p>

                  {/* Variant selector */}
                  {product.variants.length > 0 && (
                    <div>
                      <select
                        value={selectedVariantId ?? ""}
                        onChange={(e) =>
                          setSelectedVariants((prev) => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }))
                        }
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs"
                      >
                        <option value="">Select option</option>
                        {product.variants.map((v) => (
                          <option
                            key={v.id}
                            value={v.id}
                            disabled={v.inventory === 0}
                          >
                            {v.name}
                            {v.price !== null && v.price !== product.price
                              ? ` — ${formatPrice(v.price, product.currency)}`
                              : ""}
                            {v.inventory === 0 ? " (Out of stock)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="sm"
                    disabled={
                      isOutOfStock ||
                      (product.variants.length > 0 && !selectedVariantId)
                    }
                    onClick={() => addToCart(product)}
                  >
                    {isOutOfStock
                      ? "Out of Stock"
                      : product.variants.length > 0 && !selectedVariantId
                      ? "Select Option"
                      : "Add to Cart"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setCartOpen(false)}
          />

          {/* Drawer */}
          <div className="w-full max-w-sm bg-background shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Your Cart
                {cartCount > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({cartCount} item{cartCount !== 1 ? "s" : ""})
                  </span>
                )}
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCartOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground">
                    Add items from the store to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const key = `${item.product.id}-${item.variant?.id ?? "base"}`;
                    const price = item.variant?.price ?? item.product.price;
                    return (
                      <div key={key} className="flex items-start gap-3">
                        <div className="h-14 w-14 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.product.name}
                          </p>
                          {item.variant && (
                            <p className="text-xs text-muted-foreground">{item.variant.name}</p>
                          )}
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {formatPrice(price * item.quantity, item.product.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => updateQuantity(key, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-5 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => updateQuantity(key, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive ml-1"
                            onClick={() => removeFromCart(key)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t px-5 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold text-foreground text-lg">
                    {formatPrice(cartTotal)}
                  </span>
                </div>
                <Button className="w-full">
                  Checkout
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Shipping and taxes calculated at checkout
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
