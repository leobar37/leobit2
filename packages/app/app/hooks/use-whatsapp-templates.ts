import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

const WHATSAPP_TEMPLATES_KEY = ["whatsapp", "templates"];
const WHATSAPP_TEMPLATE_KEY = (id: string) => ["whatsapp", "templates", id];
const WHATSAPP_DEFAULT_TEMPLATE_KEY = ["whatsapp", "templates", "default"];

export type TemplateCategory = "cobranza" | "ventas" | "agradecimiento" | "entrega" | "otros";

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "cobranza", label: "Cobranza" },
  { value: "ventas", label: "Ventas" },
  { value: "agradecimiento", label: "Agradecimiento" },
  { value: "entrega", label: "Entrega" },
  { value: "otros", label: "Otros" },
];

export interface WhatsAppTemplate {
  id: string;
  businessUserId: string;
  businessId: string;
  name: string;
  content: string;
  category: TemplateCategory;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  content: string;
  category?: TemplateCategory;
  isDefault?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  category?: TemplateCategory;
  isDefault?: boolean;
}

export interface TemplateFilters {
  search?: string;
  category?: TemplateCategory;
  limit?: number;
  offset?: number;
}

async function fetchTemplates(filters?: TemplateFilters): Promise<WhatsAppTemplate[]> {
  const { data, error } = await api.whatsapp.templates.get({
    query: {
      search: filters?.search,
      limit: filters?.limit?.toString(),
      offset: filters?.offset?.toString(),
    },
  });
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to fetch templates");
  return data.data as unknown as WhatsAppTemplate[];
}

async function fetchTemplateById(id: string): Promise<WhatsAppTemplate> {
  const { data, error } = await api.whatsapp.templates({ id }).get();
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to fetch template");
  return data.data as unknown as WhatsAppTemplate;
}

async function fetchDefaultTemplate(): Promise<WhatsAppTemplate | null> {
  const { data, error } = await api.whatsapp.templates.default.get();
  if (error) throw new Error(String(error.value));
  if (!data?.success) throw new Error("Failed to fetch default template");
  return data.data as unknown as WhatsAppTemplate | null;
}

async function createTemplate(input: CreateTemplateInput): Promise<WhatsAppTemplate> {
  const { data, error } = await api.whatsapp.templates.post(input);
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to create template");
  return data.data as unknown as WhatsAppTemplate;
}

async function updateTemplate(
  id: string,
  input: UpdateTemplateInput
): Promise<WhatsAppTemplate> {
  const { data, error } = await api.whatsapp.templates({ id }).put(input);
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to update template");
  return data.data as unknown as WhatsAppTemplate;
}

async function deleteTemplate(id: string): Promise<void> {
  const { error } = await api.whatsapp.templates({ id }).delete();
  if (error) throw new Error(String(error.value));
}

export function useWhatsAppTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: [...WHATSAPP_TEMPLATES_KEY, filters],
    queryFn: () => fetchTemplates(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWhatsAppTemplate(id: string) {
  return useQuery({
    queryKey: WHATSAPP_TEMPLATE_KEY(id),
    queryFn: () => fetchTemplateById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDefaultWhatsAppTemplate() {
  return useQuery({
    queryKey: WHATSAPP_DEFAULT_TEMPLATE_KEY,
    queryFn: fetchDefaultTemplate,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_TEMPLATES_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_DEFAULT_TEMPLATE_KEY });
    },
  });
}

export function useUpdateWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateInput }) =>
      updateTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: WHATSAPP_TEMPLATE_KEY(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_TEMPLATES_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_DEFAULT_TEMPLATE_KEY });
    },
  });
}

export function useDeleteWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_TEMPLATES_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_DEFAULT_TEMPLATE_KEY });
    },
  });
}

export const TEMPLATE_VARIABLES = [
  { key: "nombre_cliente", label: "Nombre del Cliente", example: "Juan Pérez" },
  { key: "monto", label: "Monto", example: "S/ 150.00" },
  { key: "fecha", label: "Fecha", example: "07/03/2026" },
  { key: "telefono", label: "Teléfono", example: "+51 999 888 777" },
  { key: "productos", label: "Productos", example: "1 Pollo entero, 2 kg de alitas" },
  { key: "total", label: "Total", example: "S/ 150.00" },
] as const;

export function previewTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  Object.entries(values).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, "g"), value);
  });
  return result;
}

export function insertVariable(
  content: string,
  cursorPosition: number,
  variable: string
): { newContent: string; newCursorPosition: number } {
  const before = content.slice(0, cursorPosition);
  const after = content.slice(cursorPosition);
  const newContent = `${before}{${variable}}${after}`;
  const newCursorPosition = cursorPosition + variable.length + 2;
  return { newContent, newCursorPosition };
}
