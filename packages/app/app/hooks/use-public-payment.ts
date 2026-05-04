import { useQuery } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";

export interface PublicPaymentDetailBusiness {
  name: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
}

export interface PublicPaymentDetailCustomer {
  name: string;
}

export interface PublicPaymentDetailPayment {
  id: string;
  amount: string;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string | null;
  proofImageUrl: string | null;
}

export interface PublicPaymentDetailData {
  business: PublicPaymentDetailBusiness;
  customer: PublicPaymentDetailCustomer;
  payment: PublicPaymentDetailPayment;
}

export function usePublicPaymentDetail(slug: string | undefined, token?: string | null) {
  return useQuery({
    queryKey: ["public-payment-detail", slug, token ?? null],
    queryFn: async () => {
      if (!slug) {
        throw new Error("Detalle requerido");
      }
      if (!token) {
        throw new Error("Token requerido");
      }

      const response = await api["public"].pago({ slug }).detalle.get({
        query: { token },
      });

      return extractData<PublicPaymentDetailData>(
        response,
        "No se pudo cargar el detalle del pago"
      );
    },
    enabled: !!slug,
  });
}
