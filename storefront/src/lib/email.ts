import fs from "fs";
import path from "path";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
export const isResendConfigured = Boolean(resendApiKey);

const resend = isResendConfigured ? new Resend(resendApiKey) : null;

export interface OrderEmailItem {
  title: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export interface SendOrderConfirmationParams {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingZip: string;
  totalRetail: number;
  items: OrderEmailItem[];
}

export interface SendAdminOrderAlertParams {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingZip: string;
  totalRetail: number;
  totalWholesale?: number;
  netProfit?: number;
  paypalOrderId: string;
  items: OrderEmailItem[];
}

let cachedLogoBuffer: Buffer | null = null;
function getBrandEmblemBuffer(): Buffer | null {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  const candidates = [
    path.join(process.cwd(), "public", "brand-emblem.png"),
    path.join(process.cwd(), "storefront", "public", "brand-emblem.png"),
    path.resolve(__dirname, "../../../public/brand-emblem.png"),
    path.resolve(__dirname, "../../public/brand-emblem.png"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        cachedLogoBuffer = fs.readFileSync(c);
        return cachedLogoBuffer;
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

/**
 * Sends a responsive, mobile-optimized branded HTML order confirmation email to the buyer upon successful payment capture.
 * Features clean white header, inline CID brand logo, unbreakable status badge, and clear do-not-reply disclaimer.
 */
export async function sendOrderConfirmationEmail(params: SendOrderConfirmationParams): Promise<boolean> {
  if (!resend || !isResendConfigured) {
    console.warn("[Email Service] RESEND_API_KEY is not configured; skipped customer confirmation email.");
    return false;
  }

  const {
    orderNumber,
    customerEmail,
    customerName,
    shippingAddress,
    shippingCity,
    shippingProvince,
    shippingZip,
    totalRetail,
    items,
  } = params;

  if (!customerEmail || !customerEmail.includes("@")) {
    return false;
  }

  const logoBuffer = getBrandEmblemBuffer();
  const logoSrc = logoBuffer ? "cid:vastire-logo" : "https://vastire.com/brand-emblem.png";

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 14px 6px 14px 0; vertical-align: top;">
          <div style="font-weight: 700; color: #0f172a; font-size: 14px; line-height: 1.4;">${escapeHtml(item.title)}</div>
          ${
            item.size || item.color
              ? `<div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                  ${item.color ? `Color: <strong>${escapeHtml(item.color)}</strong>` : ""}
                  ${item.size && item.color ? " &bull; " : ""}
                  ${item.size ? `Size: <strong>${escapeHtml(item.size)}</strong>` : ""}
                </div>`
              : ""
          }
        </td>
        <td style="padding: 14px 8px; text-align: center; color: #334155; font-size: 13px; font-weight: 700; vertical-align: top; white-space: nowrap;">
          &times; ${item.quantity}
        </td>
        <td style="padding: 14px 0 14px 8px; text-align: right; color: #0f172a; font-size: 14px; font-weight: 800; vertical-align: top; white-space: nowrap;">
          $${Number(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>`
    )
    .join("");

  const emailHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>Order Confirmation - ${orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <!-- Outer wrapper with responsive padding -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 12px 6px;">
        <tr>
          <td align="center">
            <!-- Main Content Container (Full width on mobile up to 620px) -->
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
              
              <!-- White Header with Instant CID Logo -->
              <tr>
                <td style="background-color: #ffffff; padding: 22px 24px; border-bottom: 1px solid #e2e8f0;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="vertical-align: middle; width: 48px;">
                        <img src="${logoSrc}" width="44" height="35" alt="Vastire" style="display: block; width: 44px; height: auto; border: 0;" />
                      </td>
                      <td style="vertical-align: middle; padding-left: 12px;">
                        <span style="color: #064e3b; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; line-height: 1.1; display: block;">Vastire</span>
                        <span style="color: #64748b; font-size: 12px; font-weight: 500; margin-top: 2px; display: block;">Curated Home, Kitchen &amp; Workspace Essentials</span>
                      </td>
                    </tr>
                  </table>

                  <!-- Dedicated Unbreakable Status Bar -->
                  <div style="margin-top: 14px; padding: 9px 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; text-align: center;">
                    <span style="color: #065f46; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      &#10003; Order Confirmed &bull; Sent to US Fulfillment
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Email Body -->
              <tr>
                <td style="padding: 24px 20px;">
                  <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #0f172a; font-weight: 800; letter-spacing: -0.3px;">
                    Thank you for your order, ${escapeHtml(customerName)}!
                  </h2>
                  <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.55;">
                    We have received your payment. Your package will ship via tracked domestic US courier (USPS / UPS / FedEx) within 3&ndash;5 business days.
                  </p>

                  <!-- Clean Order Info Card (Mobile-stacked to prevent text overflow) -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 22px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 600; width: 40%;">Order Reference:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 800; text-align: right; white-space: nowrap;">${orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Shipping SLA:</td>
                        <td style="padding: 4px 0; color: #059669; font-weight: 700; text-align: right;">Est. 3&ndash;5 Business Days (Free)</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 600; vertical-align: top;">Deliver To:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; text-align: right;">
                          ${escapeHtml(shippingAddress)}, ${escapeHtml(shippingCity)}, ${escapeHtml(shippingProvince)} ${escapeHtml(shippingZip)}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Items Ordered Table -->
                  <div style="font-size: 14px; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
                    Items Ordered
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <thead>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <th align="left" style="padding: 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b;">Product</th>
                        <th align="center" style="padding: 8px 6px; font-size: 11px; text-transform: uppercase; color: #64748b; width: 45px;">Qty</th>
                        <th align="right" style="padding: 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; width: 75px;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding: 12px 0 4px 0; font-size: 13px; color: #64748b; text-align: right;">Subtotal:</td>
                        <td style="padding: 12px 0 4px 0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">$${Number(totalRetail).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 2px 0 8px 0; font-size: 13px; color: #64748b; text-align: right;">Domestic Delivery:</td>
                        <td style="padding: 2px 0 8px 0; font-size: 13px; color: #059669; font-weight: 700; text-align: right;">FREE</td>
                      </tr>
                      <tr style="border-top: 2px solid #e2e8f0;">
                        <td colspan="2" style="padding: 12px 0; font-size: 15px; font-weight: 800; color: #0f172a; text-align: right;">Total Paid:</td>
                        <td style="padding: 12px 0; font-size: 18px; font-weight: 800; color: #059669; text-align: right;">$${Number(totalRetail).toFixed(2)} USD</td>
                      </tr>
                    </tfoot>
                  </table>

                  <!-- Primary CTA Button -->
                  <div style="text-align: center; margin: 24px 0 16px 0;">
                    <a href="https://vastire.com/orders" style="display: block; width: 100%; box-sizing: border-box; background-color: #059669; color: #ffffff; font-weight: 800; font-size: 15px; padding: 14px 20px; text-decoration: none; border-radius: 8px; text-align: center;">
                      Track Order on Vastire &rarr;
                    </a>
                  </div>

                  <!-- Automated Email Disclaimer & Customer Support Guidance -->
                  <div style="margin-top: 22px; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                      &#9888; Automated Notification &bull; Do Not Reply
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
                      Please do not reply directly to this automated email as incoming replies are not monitored. For questions, modifications, or support, please email our team directly at:
                      <br />
                      <a href="mailto:support@vastire.com" style="color: #059669; font-weight: 700; text-decoration: underline; display: inline-block; margin-top: 4px;">
                        support@vastire.com
                      </a>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer with Clean Neutral Branding -->
              <tr>
                <td style="background-color: #f8fafc; padding: 16px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  Vastire &bull; Domestic US Fulfillment &bull; <a href="https://vastire.com" style="color: #64748b; text-decoration: none;">vastire.com</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "Vastire Orders <orders@vastire.com>";
    const replyTo = "Vastire Support <support@vastire.com>";
    const adminEmail = (
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.ADMIN_EMAIL ||
      process.env.SUPPORT_EMAIL ||
      ""
    ).trim();

    const attachments = logoBuffer
      ? [
          {
            filename: "vastire-logo.png",
            content: logoBuffer,
            contentType: "image/png",
            contentId: "vastire-logo",
          },
        ]
      : [];

    const result = await resend.emails.send({
      from: fromAddress,
      to: customerEmail,
      ...(adminEmail && adminEmail.includes("@") ? { bcc: [adminEmail] } : {}),
      replyTo,
      subject: `Order Confirmed: ${orderNumber} - Vastire`,
      html: emailHtml,
      attachments,
    });

    if (result.error) {
      console.error("[Email Service] Resend dispatch failed:", result.error);
      return false;
    }

    console.info(`[Email Service] Confirmation email dispatched successfully to ${customerEmail} (ID: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    console.error("[Email Service] Resend exception:", err?.message || err);
    return false;
  }
}

/**
 * Sends an internal, real-time alert email to the store owner / administrator
 * containing wholesale costs, net margins, customer contact, and instant admin dashboard access.
 */
export async function sendAdminOrderAlertEmail(params: SendAdminOrderAlertParams): Promise<boolean> {
  if (!resend || !isResendConfigured) return false;

  const adminEmail = (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    ""
  ).trim();

  if (!adminEmail || !adminEmail.includes("@")) {
    console.warn("[Email Service] No ADMIN_NOTIFICATION_EMAIL configured; skipped dedicated admin order alert.");
    return false;
  }

  const {
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    shippingCity,
    shippingProvince,
    shippingZip,
    totalRetail,
    totalWholesale = 0,
    netProfit = 0,
    paypalOrderId,
    items,
  } = params;

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Vastire Orders <orders@vastire.com>";
  const logoBuffer = getBrandEmblemBuffer();
  const logoSrc = logoBuffer ? "cid:vastire-logo" : "https://vastire.com/brand-emblem.png";

  const itemsList = items
    .map(
      (it) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #0f172a; font-size: 13px; font-weight: 600;">
          ${escapeHtml(it.title)}
          ${it.color || it.size ? `<div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">${it.color ? `Color: ${escapeHtml(it.color)}` : ''} ${it.size ? `Size: ${escapeHtml(it.size)}` : ''}</div>` : ''}
        </td>
        <td style="padding: 10px 6px; text-align: center; color: #475569; font-size: 13px; font-weight: 700; white-space: nowrap;">&times; ${it.quantity}</td>
        <td style="padding: 10px 0; text-align: right; color: #0f172a; font-size: 13px; font-weight: 700; white-space: nowrap;">$${Number(it.price * it.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const adminHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Alert: ${orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; color: #0f172a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 12px 6px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
              
              <!-- White Header with Instant Logo & Quick Action Link -->
              <tr>
                <td style="background-color: #ffffff; padding: 18px 20px; border-bottom: 1px solid #e2e8f0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align: middle; width: 38px;">
                              <img src="${logoSrc}" width="34" height="27" alt="Vastire" style="display: block; width: 34px; height: auto; border: 0;" />
                            </td>
                            <td style="vertical-align: middle; padding-left: 10px;">
                              <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #059669; letter-spacing: 0.5px;">Admin Alert</div>
                              <div style="font-size: 16px; font-weight: 800; color: #0f172a;">Order #${orderNumber}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td style="vertical-align: middle; text-align: right;">
                        <a href="https://vastire.com/admin/orders" style="display: inline-block; background-color: #064e3b; color: #ffffff; font-weight: 700; font-size: 12px; padding: 8px 14px; text-decoration: none; border-radius: 6px; white-space: nowrap;">
                          Open Admin &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Financial Summary (3-Metric Banner) -->
              <tr>
                <td style="padding: 20px 20px 10px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 14px; margin-bottom: 18px;">
                    <tr>
                      <td style="width: 33%; text-align: left;">
                        <div style="font-size: 10px; color: #047857; text-transform: uppercase; font-weight: 700;">Buyer Paid</div>
                        <div style="font-size: 16px; color: #065f46; font-weight: 800; margin-top: 2px;">$${totalRetail.toFixed(2)}</div>
                      </td>
                      <td style="width: 33%; text-align: center; border-left: 1px solid #a7f3d0; border-right: 1px solid #a7f3d0;">
                        <div style="font-size: 10px; color: #047857; text-transform: uppercase; font-weight: 700;">Cost</div>
                        <div style="font-size: 16px; color: #065f46; font-weight: 800; margin-top: 2px;">$${totalWholesale.toFixed(2)}</div>
                      </td>
                      <td style="width: 33%; text-align: right;">
                        <div style="font-size: 10px; color: #047857; text-transform: uppercase; font-weight: 700;">Net Profit</div>
                        <div style="font-size: 16px; color: #059669; font-weight: 800; margin-top: 2px;">+$${netProfit.toFixed(2)}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Customer & Shipping Details -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 18px; font-size: 13px;">
                    <div style="margin-bottom: 8px;">
                      <span style="color: #64748b; font-weight: 600;">Customer: </span>
                      <strong style="color: #0f172a;">${escapeHtml(customerName)}</strong>
                      <span style="color: #64748b;">(<a href="mailto:${customerEmail}" style="color: #059669; text-decoration: none;">${customerEmail}</a>)</span>
                    </div>
                    ${customerPhone ? `<div style="margin-bottom: 8px;"><span style="color: #64748b; font-weight: 600;">Phone: </span><span style="color: #0f172a;">${escapeHtml(customerPhone)}</span></div>` : ''}
                    <div style="margin-bottom: 8px;">
                      <span style="color: #64748b; font-weight: 600;">Ship To: </span>
                      <span style="color: #0f172a; font-weight: 600;">${escapeHtml(shippingAddress)}, ${escapeHtml(shippingCity)}, ${shippingProvince} ${shippingZip}</span>
                    </div>
                    <div>
                      <span style="color: #64748b; font-weight: 600;">PayPal Ref: </span>
                      <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${escapeHtml(paypalOrderId)}</code>
                    </div>
                  </div>

                  <!-- Ordered Items -->
                  <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                    Ordered Items (${items.length})
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
                    <tbody>
                      ${itemsList}
                    </tbody>
                  </table>

                  <!-- Full-Width Admin Dashboard Button -->
                  <div style="text-align: center; margin: 16px 0 8px 0; border-top: 1px solid #e2e8f0; padding-top: 14px;">
                    <a href="https://vastire.com/admin/orders" style="display: block; width: 100%; box-sizing: border-box; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 14px; padding: 13px 20px; text-decoration: none; border-radius: 8px; text-align: center;">
                      Open Vastire Admin Orders Dashboard &rarr;
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 12px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  Automated Internal Notification &bull; Vastire Administration
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  try {
    const attachments = logoBuffer
      ? [
          {
            filename: "vastire-logo.png",
            content: logoBuffer,
            contentType: "image/png",
            contentId: "vastire-logo",
          },
        ]
      : [];

    const result = await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject: `🛒 [NEW ORDER] $${totalRetail.toFixed(2)} - Order #${orderNumber} (${customerName})`,
      html: adminHtml,
      attachments,
    });

    if (result.error) {
      console.error("[Email Service] Admin notification failed:", result.error);
      return false;
    }
    console.info(`[Email Service] Admin alert sent to ${adminEmail} (ID: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    console.error("[Email Service] Admin alert exception:", err?.message || err);
    return false;
  }
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
