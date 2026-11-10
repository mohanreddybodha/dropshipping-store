import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createCjOrder, resolveItemVid, CjOrderProduct } from "@/lib/cjClient";
import {
  getPayPalCredentials,
  getPayPalAccessToken,
  sanitizeOrderNumber,
  generateUniqueOrderNumber,
  verifyPayPalOrderCommitment,
  refundPayPalCapture,
  PayPalConfigError,
  PayPalGatewayError,
} from "@/lib/paypal";
import { resolveAuthoritativeCart, CatalogPricingError } from "@/lib/pricing";
import {
  US_STATE_ZIP_PREFIXES,
  validateUsStreetAddress,
  validateUsCity,
  validateUsZip,
  validateUsPhone,
} from "@/lib/usAddressValidation";

export const dynamic = "force-dynamic";

function isLiveDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL || "";
  return Boolean(url) && !url.includes("mock") && !url.includes("localhost");
}

function validatePreCaptureCustomerAndShipping(body: any): {
  error?: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  zip: string;
  country: string;
} {
  const email = String(body.customer_email || "").trim().toLowerCase();
  const name = String(body.customer_name || "Valued Customer").trim() || "Valued Customer";
  const rawPhone = String(body.customer_phone || "").trim();
  const address = String(body.shipping_address || "").trim();
  const city = String(body.shipping_city || "").trim();
  const province = String(body.shipping_province || "").trim().toUpperCase();
  const rawZip = String(body.shipping_zip || "").trim();
  const country = String(body.shipping_country || "US").trim().toUpperCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "A valid customer email address is required.", email, name, phone: rawPhone, address, city, province, zip: rawZip, country };
  }

  if (country !== "US") {
    return { error: "Domestic fulfillment is strictly restricted to the United States.", email, name, phone: rawPhone, address, city, province, zip: rawZip, country };
  }

  if (!province || !US_STATE_ZIP_PREFIXES[province] || province === "AK" || province === "HI") {
    return { error: "Delivery state must be within the 48 Contiguous United States (no AK/HI).", email, name, phone: rawPhone, address, city, province, zip: rawZip, country };
  }

  const phoneVal = validateUsPhone(rawPhone);
  if (!phoneVal.isValid || !phoneVal.formatted) {
    return { error: phoneVal.error || "A valid 10-digit US mobile number is required.", email, name, phone: rawPhone, address, city, province, zip: rawZip, country };
  }

  const streetVal = validateUsStreetAddress(address);
  if (!streetVal.isValid) {
    return { error: streetVal.error || "A valid US street address is required.", email, name, phone: phoneVal.formatted, address, city, province, zip: rawZip, country };
  }

  const cityVal = validateUsCity(city);
  if (!cityVal.isValid) {
    return { error: cityVal.error || "A valid US city is required.", email, name, phone: phoneVal.formatted, address, city, province, zip: rawZip, country };
  }

  const zipVal = validateUsZip(rawZip, province);
  if (!zipVal.isValid || !zipVal.formatted) {
    return { error: zipVal.error || "A valid 5-digit US ZIP code matching the selected state is required.", email, name, phone: phoneVal.formatted, address, city, province, zip: rawZip, country };
  }

  return {
    email,
    name: name.slice(0, 120),
    phone: phoneVal.formatted,
    address: address.slice(0, 200),
    city: city.slice(0, 100),
    province,
    zip: zipVal.formatted,
    country: "US",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const { paypal_order_id, internal_order_number, items = [], firebase_uid } = body;

    if (
      !paypal_order_id ||
      typeof paypal_order_id !== "string" ||
      !/^[A-Za-z0-9_-]{10,64}$/.test(paypal_order_id.trim())
    ) {
      return NextResponse.json(
        { error: "Invalid payment transaction token." },
        { status: 400 }
      );
    }
    const cleanPayPalOrderId = paypal_order_id.trim();

    // 1. Fail-Closed Pre-Capture Shipping & Cart Validation
    // Ensures we NEVER capture customer funds for an unfulfillable address or manipulated cart.
    const validatedCustomer = validatePreCaptureCustomerAndShipping(body);
    if (validatedCustomer.error) {
      return NextResponse.json(
        { error: validatedCustomer.error, code: "INVALID_SHIPPING_DETAILS" },
        { status: 400 }
      );
    }

    const cart = await resolveAuthoritativeCart(items);
    if (cart.total <= 0 || cart.verifiedItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid cart items or zero order total." },
        { status: 400 }
      );
    }

    const creds = getPayPalCredentials({ requireSecret: true });

    // 2. Anti-Replay Guard: Check database deduplication (hard-block on DB failure)
    const sql = getDb();
    try {
      const duplicateTxn = await sql`
        SELECT
          id, internal_order_number, cj_order_id, tracking_number, carrier_name,
          status, total_retail, shipping_name, shipping_city, shipping_province,
          shipping_zip, items_json, created_at
        FROM orders
        WHERE stripe_payment_intent_id = ${cleanPayPalOrderId}
        LIMIT 1
      `;
      if (duplicateTxn.length > 0) {
        console.warn(
          `[PayPal Capture] Idempotent replay detected for transaction: ${cleanPayPalOrderId}`
        );
        const existing = duplicateTxn[0];
        let storedItems = cart.verifiedItems;
        try {
          if (typeof existing.items_json === "string") {
            storedItems = JSON.parse(existing.items_json);
          } else if (Array.isArray(existing.items_json)) {
            storedItems = existing.items_json;
          }
        } catch {}

        return NextResponse.json({
          id: existing.id,
          internal_order_number: existing.internal_order_number,
          cj_order_id: existing.cj_order_id || null,
          status: existing.status,
          total_retail: Number(existing.total_retail),
          carrier_name: existing.carrier_name || "USPS",
          tracking_number: existing.tracking_number || null,
          shipping_name: existing.shipping_name || validatedCustomer.name,
          shipping_city: existing.shipping_city || validatedCustomer.city,
          shipping_province: existing.shipping_province || validatedCustomer.province,
          shipping_zip: existing.shipping_zip || validatedCustomer.zip,
          created_at: existing.created_at || new Date().toISOString(),
          items: storedItems,
          paypal_order_id: cleanPayPalOrderId,
        });
      }
    } catch (checkErr: any) {
      console.error(
        "[PayPal Capture] Database deduplication check FAILED — blocking capture:",
        checkErr?.message || checkErr
      );
      return NextResponse.json(
        {
          error:
            "Payment verification temporarily unavailable. Please contact support with your order reference.",
        },
        { status: 503 }
      );
    }

    // 3. Get OAuth Token & Inspect Existing Order State on PayPal
    const accessToken = await getPayPalAccessToken(creds);
    let captureData: any = null;

    try {
      const lookupRes = await fetch(
        `${creds.baseUrl}/v2/checkout/orders/${encodeURIComponent(cleanPayPalOrderId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (lookupRes.ok) {
        const existingOrder = await lookupRes.json();
        if (existingOrder.status === "COMPLETED") {
          console.info(
            `[PayPal Capture] Order ${cleanPayPalOrderId} already COMPLETED. Reusing verified capture state.`
          );
          captureData = existingOrder;
        }
      }
    } catch (lookupErr) {
      console.debug("[PayPal Capture] Pre-check lookup skipped:", lookupErr);
    }

    // Execute authoritative Capture with deterministic Idempotency Key
    if (!captureData) {
      const captureRes = await fetch(
        `${creds.baseUrl}/v2/checkout/orders/${encodeURIComponent(cleanPayPalOrderId)}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": `capture-${cleanPayPalOrderId}`,
          },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(15_000),
        }
      );

      if (!captureRes.ok) {
        const errJson = await captureRes.json().catch(() => ({}));
        const issue = String(errJson.details?.[0]?.issue || "");
        if (captureRes.status === 422 && issue.includes("ORDER_ALREADY_CAPTURED")) {
          const finalLookup = await fetch(
            `${creds.baseUrl}/v2/checkout/orders/${encodeURIComponent(cleanPayPalOrderId)}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              signal: AbortSignal.timeout(10_000),
            }
          );
          if (finalLookup.ok) {
            captureData = await finalLookup.json();
          }
        }

        if (!captureData) {
          console.error(
            "[PayPal Capture] Capture API rejected request:",
            captureRes.status,
            issue || errJson?.name || ""
          );
          return NextResponse.json(
            {
              error:
                issue === "ORDER_NOT_APPROVED"
                  ? "Payment has not been approved by the payer."
                  : "Unable to capture payment from provider. Order not confirmed.",
            },
            { status: captureRes.status === 422 ? 400 : 502 }
          );
        }
      } else {
        captureData = await captureRes.json();
      }
    }

    // 4. Strict Capture-Level & Order-Level Verification
    // Reject APPROVED (unsettled), PENDING (eCheck / fraud hold), VOIDED, or non-USD captures.
    if (captureData?.status !== "COMPLETED") {
      console.error(
        `[PayPal Capture] Order not COMPLETED (status: ${captureData?.status})`
      );
      return NextResponse.json(
        {
          error: `Payment did not settle (order status: ${
            captureData?.status || "UNKNOWN"
          }).`,
        },
        { status: 400 }
      );
    }

    const unit = captureData?.purchase_units?.[0];
    const captures = unit?.payments?.captures || [];
    const captureObj = captures[0];

    if (!captureObj || captureObj.status !== "COMPLETED") {
      console.error(
        `[PayPal Capture] Capture object missing or unsettled (capture status: ${captureObj?.status})`
      );
      return NextResponse.json(
        {
          error: `Payment funds have not cleared (${
            captureObj?.status || "NO_CAPTURE"
          }). Order cannot be confirmed yet.`,
        },
        { status: 400 }
      );
    }

    const capturedCurrency = String(
      captureObj.amount?.currency_code || ""
    ).toUpperCase();
    const totalRetail = parseFloat(captureObj.amount?.value || "0");

    if (
      capturedCurrency !== "USD" ||
      !Number.isFinite(totalRetail) ||
      totalRetail <= 0
    ) {
      console.error(
        `[PayPal Capture] Invalid capture currency (${capturedCurrency}) or amount (${totalRetail})`
      );
      return NextResponse.json(
        { error: "Payment verification failed: invalid currency or captured amount." },
        { status: 400 }
      );
    }

    // 5. Cryptographic Anti-Swap & Price Reconciliation Guard
    // Blocks paying $0.01 or $10 via one order then swapping expensive items at capture.
    const priceDiff = Math.abs(totalRetail - cart.total);
    const customId = String(unit?.custom_id || "");
    const commitmentValid = verifyPayPalOrderCommitment(
      customId,
      {
        total: cart.total,
        currency: "USD",
        items: cart.verifiedItems.map((it) => ({
          vid: it.vid,
          quantity: it.quantity,
        })),
      },
      creds.secret
    );

    if (priceDiff > 0.05 || !commitmentValid) {
      console.error(
        `[SECURITY ALERT] PayPal capture integrity mismatch for ${cleanPayPalOrderId}: captured=$${totalRetail}, expected=$${cart.total}, commitmentValid=${commitmentValid}. Initiating automatic refund.`
      );
      if (captureObj.id) {
        await refundPayPalCapture({
          creds,
          accessToken,
          captureId: captureObj.id,
          amount: totalRetail,
          reason: "Order verification mismatch. Automatic refund issued.",
          idempotencyKey: `integrity-refund-${cleanPayPalOrderId}`,
        }).catch((refErr) =>
          console.error(
            `[SECURITY ALERT] Automatic mismatch refund failed for ${captureObj.id}:`,
            refErr
          )
        );
      }
      return NextResponse.json(
        {
          error:
            "Order pricing verification mismatch detected. Payment has been automatically refunded.",
          code: "PAYMENT_VERIFICATION_FAILED",
        },
        { status: 400 }
      );
    }

    // 6. Collision-Safe Atomic Order Persistence
    let orderNumber = sanitizeOrderNumber(
      unit?.reference_id || internal_order_number
    );
    const tracking = null;
    const carrier = "USPS";
    const wholesale = +cart.totalWholesale.toFixed(2);
    const profit = +(totalRetail - wholesale).toFixed(2);
    let orderId: number = Date.now();
    let dbPersisted = false;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const existingByTxn = await sql`
          SELECT id, internal_order_number
          FROM orders
          WHERE stripe_payment_intent_id = ${cleanPayPalOrderId}
          LIMIT 1
        `;

        if (existingByTxn.length > 0) {
          orderId = existingByTxn[0].id;
          orderNumber = existingByTxn[0].internal_order_number;
          await sql`
            UPDATE orders SET
              customer_email = ${validatedCustomer.email},
              customer_phone = ${validatedCustomer.phone},
              shipping_name = ${validatedCustomer.name},
              shipping_address = ${validatedCustomer.address},
              shipping_city = ${validatedCustomer.city},
              shipping_province = ${validatedCustomer.province},
              shipping_zip = ${validatedCustomer.zip},
              shipping_country = ${validatedCustomer.country},
              total_retail = ${totalRetail},
              total_wholesale = ${wholesale},
              net_profit = ${profit},
              carrier_name = ${carrier},
              items_json = ${JSON.stringify(cart.verifiedItems)},
              updated_at = NOW()
            WHERE id = ${orderId}
          `;
        } else {
          // Guard against internal_order_number collision with a DIFFERENT paid transaction
          const existingByNum = await sql`
            SELECT id FROM orders
            WHERE internal_order_number = ${orderNumber}
            LIMIT 1
          `;
          if (existingByNum.length > 0) {
            orderNumber = generateUniqueOrderNumber();
          }

          const inserted = await sql`
            INSERT INTO orders (
              internal_order_number, customer_email, customer_phone, status,
              stripe_payment_intent_id, total_retail, total_wholesale, net_profit,
              shipping_name, shipping_address, shipping_city, shipping_province,
              shipping_zip, shipping_country, carrier_name, tracking_number,
              items_json, created_at, updated_at
            ) VALUES (
              ${orderNumber}, ${validatedCustomer.email}, ${validatedCustomer.phone}, 'ORDER_PLACED',
              ${cleanPayPalOrderId}, ${totalRetail}, ${wholesale}, ${profit},
              ${validatedCustomer.name}, ${validatedCustomer.address}, ${validatedCustomer.city},
              ${validatedCustomer.province}, ${validatedCustomer.zip}, ${validatedCustomer.country},
              ${carrier}, ${tracking}, ${JSON.stringify(cart.verifiedItems)}, NOW(), NOW()
            )
            RETURNING id
          `;
          if (inserted.length > 0) {
            orderId = inserted[0].id;
          }
        }

        // Sync user profile non-critically
        if (firebase_uid || validatedCustomer.email) {
          try {
            const userRows = await sql`
              SELECT id FROM users
              WHERE (firebase_uid = ${firebase_uid || ""} AND ${Boolean(firebase_uid)})
                 OR (email = ${validatedCustomer.email} AND ${Boolean(validatedCustomer.email)})
              LIMIT 1
            `;
            if (userRows.length > 0) {
              await sql`
                UPDATE users SET
                  last_login_at = NOW(),
                  email = COALESCE(email, ${validatedCustomer.email}),
                  display_name = COALESCE(display_name, ${validatedCustomer.name}),
                  phone_number = COALESCE(phone_number, ${validatedCustomer.phone})
                WHERE id = ${userRows[0].id}
              `;
            } else if (firebase_uid) {
              await sql`
                INSERT INTO users (firebase_uid, email, display_name, phone_number, created_at, last_login_at)
                VALUES (${firebase_uid}, ${validatedCustomer.email}, ${validatedCustomer.name}, ${validatedCustomer.phone}, NOW(), NOW())
              `;
            }
          } catch (userErr: any) {
            console.warn("[PayPal Capture] User upsert warning:", userErr?.message || userErr);
          }
        }

        dbPersisted = true;
        break;
      } catch (dbErr: any) {
        console.error(
          `[PayPal Capture] DB persistence attempt ${attempt} failed for ${cleanPayPalOrderId}:`,
          dbErr?.message || dbErr
        );
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }

    if (!dbPersisted && isLiveDatabaseConfigured()) {
      console.error(
        `[CRITICAL_PAID_ORDER_DB_FAILURE] PayPal Capture ${captureObj.id} (${cleanPayPalOrderId}) for $${totalRetail} could NOT be persisted to Postgres! Order=${orderNumber}, Email=${validatedCustomer.email}`
      );
      return NextResponse.json(
        {
          error: `Payment was captured (Reference: ${cleanPayPalOrderId}), but order persistence encountered a database error. Please save this reference and contact support immediately.`,
          paypal_order_id: cleanPayPalOrderId,
          capture_id: captureObj.id,
        },
        { status: 500 }
      );
    }

    // 7. Automated Supplier Fulfillment Pipeline (Live Mode Only — Protects CJ Account During Sandbox Testing)
    let cjOrderId: string | null = null;
    let fulfillmentStatus = "PENDING";
    let fulfillmentError: string | null = null;

    const shouldDispatchToCj =
      creds.mode === "live" || process.env.ENABLE_SANDBOX_CJ_DISPATCH === "true";

    if (!shouldDispatchToCj) {
      fulfillmentStatus = "SANDBOX_SKIPPED";
      console.info(
        `[Fulfillment] Sandbox mode active: skipping real CJ Dropshipping API call for test order ${orderNumber}.`
      );
      try {
        await sql`
          UPDATE orders SET
            fulfillment_status = ${fulfillmentStatus},
            updated_at = NOW()
          WHERE id = ${orderId}
        `;
      } catch {}
    } else {
      try {
        const cjProducts: CjOrderProduct[] = [];
        for (const it of cart.verifiedItems) {
          const vid = resolveItemVid(it);
          if (vid) {
            cjProducts.push({ vid, quantity: Number(it.quantity || 1) });
          }
        }

        if (cjProducts.length > 0) {
          const cjResult = await createCjOrder({
            orderNumber,
            shippingName: validatedCustomer.name,
            shippingAddress: validatedCustomer.address,
            shippingCity: validatedCustomer.city,
            shippingProvince: validatedCustomer.province,
            shippingZip: validatedCustomer.zip,
            shippingCountryCode: validatedCustomer.country,
            shippingPhone: validatedCustomer.phone,
            customerEmail: validatedCustomer.email,
            products: cjProducts,
            logisticName: "USPS US to US",
            remark: "Vastire Headless Store Order",
          });

          if (cjResult.success) {
            cjOrderId = cjResult.cjOrderId || null;
            fulfillmentStatus = "SUPPLIER_PROCESSING";
            console.info(
              `[Fulfillment] Order ${orderNumber} submitted to CJ (CJ Order ID: ${cjOrderId})`
            );
          } else {
            fulfillmentStatus = "FULFILLMENT_FAILED";
            fulfillmentError = cjResult.message || "CJ order creation failed";
            console.error(
              `[Fulfillment] Order ${orderNumber} failed CJ submission: ${fulfillmentError}`
            );
          }
        } else {
          fulfillmentStatus = "FULFILLMENT_FAILED";
          fulfillmentError = "Unable to resolve valid variant ID (VID) for line items.";
          console.warn(`[Fulfillment] Order ${orderNumber} has no resolvable VIDs.`);
        }

        await sql`
          UPDATE orders SET
            cj_order_id = ${cjOrderId},
            status = ${
              fulfillmentStatus === "SUPPLIER_PROCESSING"
                ? "SUPPLIER_PROCESSING"
                : "ORDER_PLACED"
            },
            fulfillment_status = ${fulfillmentStatus},
            fulfillment_error = ${fulfillmentError},
            updated_at = NOW()
          WHERE id = ${orderId}
        `;
      } catch (fulfillErr: any) {
        console.error(
          `[Fulfillment] Unexpected fulfillment exception for ${orderNumber}:`,
          fulfillErr
        );
        try {
          await sql`
            UPDATE orders SET
              fulfillment_status = 'FULFILLMENT_FAILED',
              fulfillment_error = ${fulfillErr?.message || "Fulfillment exception"},
              updated_at = NOW()
            WHERE id = ${orderId}
          `;
        } catch {}
      }
    }

    const finalStatus =
      fulfillmentStatus === "SUPPLIER_PROCESSING"
        ? "SUPPLIER_PROCESSING"
        : "ORDER_PLACED";

    return NextResponse.json({
      id: orderId,
      internal_order_number: orderNumber,
      cj_order_id: cjOrderId,
      status: finalStatus,
      total_retail: totalRetail,
      carrier_name: carrier,
      tracking_number: tracking,
      shipping_name: validatedCustomer.name,
      shipping_city: validatedCustomer.city,
      shipping_province: validatedCustomer.province,
      shipping_zip: validatedCustomer.zip,
      created_at: new Date().toISOString(),
      items: cart.verifiedItems,
      paypal_order_id: cleanPayPalOrderId,
      capture_id: captureObj.id,
    });
  } catch (err: any) {
    if (err instanceof CatalogPricingError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    if (err instanceof PayPalConfigError || err instanceof PayPalGatewayError) {
      console.error(`[PayPal Capture] ${err.name}:`, err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[PayPal Capture] Unexpected capture error:", err);
    return NextResponse.json(
      { error: "Payment processing failed. Please contact customer support." },
      { status: 500 }
    );
  }
}
