type PayPalIntent = "CAPTURE" | "AUTHORIZE";

type PayPalLink = {
  href: string;
  rel: string;
  method: string;
};

type CreatePayPalOrderInput = {
  amount: number;
  currencyCode?: string;
  description: string;
  brandName?: string;
  intent?: PayPalIntent;
  returnUrl?: string;
  cancelUrl?: string;
};

export type PayPalOrderResult = {
  orderId: string;
  status: string;
  approvalUrl: string;
};

const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";
const DEFAULT_BRAND_NAME = "DentaCore";
const DEFAULT_RETURN_URL = "https://dentacore.app/paypal-success";
const DEFAULT_CANCEL_URL = "https://dentacore.app/paypal-cancel";

const PAYPAL_CLIENT_ID = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.EXPO_PUBLIC_PAYPAL_SECRET;

const ensureCredentials = () => {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error(
      "Missing PayPal credentials. Please set EXPO_PUBLIC_PAYPAL_CLIENT_ID and EXPO_PUBLIC_PAYPAL_SECRET.",
    );
  }
};

const encodeBase64 = (value: string): string => {
  const globalBtoa = (
    globalThis as typeof globalThis & {
      btoa?: typeof btoa;
    }
  ).btoa;

  if (typeof globalBtoa === "function") {
    return globalBtoa(value);
  }

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;

  while (i < value.length) {
    const chr1 = value.charCodeAt(i++);
    const chr2 = value.charCodeAt(i++);
    const chr3 = value.charCodeAt(i++);

    const enc1 = chr1 >> 2;
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    let enc4 = chr3 & 63;

    if (Number.isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (Number.isNaN(chr3)) {
      enc4 = 64;
    }

    output +=
      chars.charAt(enc1) +
      chars.charAt(enc2) +
      chars.charAt(enc3) +
      chars.charAt(enc4);
  }

  return output;
};

const fetchAccessToken = async (): Promise<string> => {
  ensureCredentials();

  const credentials = encodeBase64(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  );
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to authenticate with PayPal: ${errorText}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("PayPal token response did not include access_token");
  }

  return payload.access_token;
};

export const createPayPalOrder = async (
  input: CreatePayPalOrderInput,
): Promise<PayPalOrderResult> => {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("A valid amount is required to create a PayPal order.");
  }

  const accessToken = await fetchAccessToken();
  const payload = {
    intent: input.intent ?? "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: input.currencyCode ?? "PHP",
          value: input.amount.toFixed(2),
        },
        description: input.description,
      },
    ],
    application_context: {
      brand_name: input.brandName ?? DEFAULT_BRAND_NAME,
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: input.returnUrl ?? DEFAULT_RETURN_URL,
      cancel_url: input.cancelUrl ?? DEFAULT_CANCEL_URL,
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create PayPal order: ${errorText}`);
  }

  const order = (await response.json()) as {
    id: string;
    status: string;
    links?: PayPalLink[];
  };

  const approvalLink = order.links?.find((link) => link.rel === "approve");
  if (!approvalLink) {
    throw new Error(
      "PayPal order was created but no approval link was returned.",
    );
  }

  return {
    orderId: order.id,
    status: order.status,
    approvalUrl: approvalLink.href,
  };
};
