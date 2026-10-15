import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;

export async function initializePaddle() {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      window.Paddle.Environment.set(getPaddleEnvironment() === "sandbox" ? "sandbox" : "production");
      window.Paddle.Initialize({ token: clientToken });
      paddleInitialized = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment: getPaddleEnvironment() },
  });
  if (error || !data?.paddleId) throw new Error(`Failed to resolve price: ${priceId}`);
  return data.paddleId;
}

export async function openPaddleCheckout(opts: { priceId: string; email?: string; userId: string; successUrl: string }) {
  await initializePaddle();
  const paddlePriceId = await getPaddlePriceId(opts.priceId);
  window.Paddle.Checkout.open({
    items: [{ priceId: paddlePriceId, quantity: 1 }],
    customer: opts.email ? { email: opts.email } : undefined,
    customData: { userId: opts.userId },
    settings: { displayMode: "overlay", successUrl: opts.successUrl, allowLogout: false, variant: "one-page" },
  });
}
