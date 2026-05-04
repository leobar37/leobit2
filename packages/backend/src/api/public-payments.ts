import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { businesses } from "../db/schema/businesses";
import { customers } from "../db/schema/customers";
import { files } from "../db/schema/files";
import { abonos } from "../db/schema/payments";
import { paymentTokens } from "../db/schema/payment-tokens";
import { db } from "../lib/db";
import { r2Storage } from "../services/r2-storage.service";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { servicesPlugin } from "../plugins/services";
import { isValidPaymentTokenFormat } from "../services/business/payment-token.service";

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function serializeDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

async function getBusinessBySlug(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.publicCatalogSlug, normalizedSlug));

  if (!business || !business.isActive) {
    throw new NotFoundError("Detalle del pago");
  }

  return business;
}

async function getTokenPaymentContext(slug: string, token: string) {
  if (!isValidPaymentTokenFormat(token)) {
    throw new ValidationError("Token inválido");
  }

  const business = await getBusinessBySlug(slug);
  const [tokenRecord] = await db
    .select({ token: paymentTokens, payment: abonos })
    .from(paymentTokens)
    .innerJoin(abonos, eq(abonos.id, paymentTokens.paymentId))
    .where(
      and(
        eq(paymentTokens.token, token),
        eq(abonos.businessId, business.id)
      )
    );

  if (!tokenRecord) {
    throw new NotFoundError("Pago");
  }

  if (!tokenRecord.token.isActive) {
    throw new ForbiddenError("El token no está activo");
  }

  if (tokenRecord.token.expiresAt && new Date() > tokenRecord.token.expiresAt) {
    throw new ForbiddenError("El enlace ha expirado");
  }

  await db
    .update(paymentTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(paymentTokens.id, tokenRecord.token.id));

  return { business, payment: tokenRecord.payment };
}

export const publicPaymentRoutes = new Elysia({ prefix: "/public" })
  .use(servicesPlugin)
  .get(
    "/pago/:slug/detalle",
    async ({ params, query }) => {
      const token = query.token;
      if (!token) {
        throw new ValidationError("Token requerido");
      }

      const { business, payment } = await getTokenPaymentContext(params.slug, token);

      const [customer] = await db
        .select({
          id: customers.id,
          name: customers.name,
        })
        .from(customers)
        .where(
          and(
            eq(customers.id, payment.customerId),
            eq(customers.businessId, business.id)
          )
        )
        .limit(1);

      if (!customer) {
        throw new NotFoundError("Cliente");
      }

      let proofImageUrl: string | null = null;
      if (payment.proofImageId) {
        const [proofFile] = await db
          .select()
          .from(files)
          .where(eq(files.id, payment.proofImageId))
          .limit(1);

        if (proofFile) {
          proofImageUrl = await r2Storage.getFileUrl(proofFile.storagePath);
        }
      }

      return {
        success: true,
        data: {
          business: {
            name: business.name,
            phone: business.phone,
            address: business.address,
            logoUrl: business.logoUrl,
          },
          customer: {
            name: customer.name,
          },
          payment: {
            id: payment.id,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            referenceNumber: payment.referenceNumber,
            notes: payment.notes,
            createdAt: serializeDateTime(payment.createdAt),
            proofImageUrl,
          },
        },
      };
    },
    {
      params: t.Object({ slug: t.String() }),
      query: t.Object({ token: t.String() }),
    }
  );
