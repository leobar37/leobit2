import { camelCase, pascalCase } from "../../utils/string-utils";
import type { EntitySyncConfig, RelationGraph } from "../../config/types";
import { buildRelationGraph } from "../../config/introspect";

export interface HookOutput {
  listHook: string;
  singleHook: string;
  createHook: string;
  updateHook: string;
  deleteHook: string;
}

export function generateHooks(
  entityName: string,
  config: EntitySyncConfig,
  allEntities: Record<string, EntitySyncConfig>
): HookOutput {
  const graph = buildRelationGraph(allEntities);
  const hasChildren = graph[entityName]?.children.length > 0;

  return {
    listHook: generateListHook(entityName),
    singleHook: generateSingleHook(entityName),
    createHook: hasChildren
      ? generateCreateWithChildren(entityName, config, graph, allEntities)
      : generateSimpleCreate(entityName),
    updateHook: generateUpdateHook(entityName),
    deleteHook: generateDeleteHook(entityName),
  };
}

function generateListHook(entityName: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function use${pascalName}List() {
  return useQuery({
    queryKey: ["${entityName}"],
    queryFn: async () => {
      const { data, error } = await api.${entityName}.get();
      if (error) throw new Error(String(error.value));
      return ${entityName}Schema.array().parse(data);
    },
  });
}
`;
}

function generateSingleHook(entityName: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function use${pascalName}(id: string) {
  return useQuery({
    queryKey: ["${entityName}", id],
    queryFn: async () => {
      const { data, error } = await api.${entityName}({ id }).get();
      if (error) throw new Error(String(error.value));
      return ${entityName}Schema.parse(data);
    },
    enabled: !!id,
  });
}
`;
}

function generateSimpleCreate(entityName: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function useCreate${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: Create${pascalName}Input) => {
      // Generate CUID2 - this IS the real ID
      const id = createId();
      
      const response = await api.${entityName}.post({
        ...input,
        id,
      });
      
      if (response.error) throw new Error(String(response.error.value));
      return ${entityName}Schema.parse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
    },
  });
}
`;
}

function generateCreateWithChildren(
  entityName: string,
  config: EntitySyncConfig,
  graph: RelationGraph,
  allEntities: Record<string, EntitySyncConfig>
): string {
  const pascalName = pascalCase(entityName);
  const children = graph[entityName]?.children || [];

  const childrenOps = children
    .map((child) => {
      const parentConfig = allEntities[entityName];
      const relationConfig = parentConfig?.relations?.children?.find(
        (c) => c.entity === child
      );
      const fkColumn = relationConfig?.foreignKey || `${entityName.replace(/s$/, "")}_id`;
      return `
      const ${child}Ops = (input.${child}?.map((item) => ({
        idempotencyKey: generateIdempotencyKey(),
        entityType: "${child}",
        operation: "create" as const,
        entityId: createId(),
        payload: {
          ...item,
          ${fkColumn}: parentId,
        },
        localTimestamp: new Date().toISOString(),
      })) || []);
      `;
    })
    .join("\n");

  const opsSpread = children.map((c) => `...${c}Ops`).join(", ");

  return `
export function useCreate${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: Create${pascalName}Input & { ${children.map((c) => `${c}?: Create${pascalCase(c)}Input[]`).join("; ")} }) => {
      // 1. Generate CUID2 for parent (this IS the real ID)
      const parentId = createId();
      
      // 2. Build parent operation (uses FK-based ordering via payload references)
      const parentOp = {
        idempotencyKey: generateIdempotencyKey(),
        entityType: "${entityName}",
        operation: "create" as const,
        entityId: parentId,
        payload: { ...input, id: parentId },
        localTimestamp: new Date().toISOString(),
      };
      
      // 3. Build children with REAL parent ID via FK reference
      ${childrenOps}
      
      // 4. Send atomic batch
      const result = await api.sync.batch.post({
        operations: [parentOp, ${opsSpread}],
      });
      
      if (result.error) throw new Error(String(result.error.value));
      
      // Return with real ID (immediately usable in URL)
      return { id: parentId, ...result.data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
      ${children.map((c) => `queryClient.invalidateQueries({ queryKey: ["${c}"] });`).join("\n      ")}
    },
  });
}
`;
}

function generateUpdateHook(entityName: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function useUpdate${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Create${pascalName}Input> }) => {
      const response = await api.${entityName}({ id }).put(data);
      if (response.error) throw new Error(String(response.error.value));
      return ${entityName}Schema.parse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
      queryClient.invalidateQueries({ queryKey: ["${entityName}", variables.id] });
    },
  });
}
`;
}

function generateDeleteHook(entityName: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function useDelete${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.${entityName}({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
    },
  });
}
`;
}

export function generateHooksFile(
  hooks: Map<string, HookOutput>,
  allEntities: Record<string, EntitySyncConfig>
): string {
  const entityNames = Array.from(hooks.keys());

  const imports = `
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { createId } from "@paralleldrive/cuid2";
import { 
  ${entityNames.map((e) => `${e}Schema`).join(", ")}
} from "./schemas";
import type { 
  ${entityNames.map((e) => `Create${pascalCase(e)}Input`).join(", ")}
} from "./types";
import { generateIdempotencyKey } from "@avileo/shared";
`;

  const content = Array.from(hooks.entries())
    .map(([name, hook]) => {
      return `
// ${pascalCase(name)} hooks
${hook.listHook}
${hook.singleHook}
${hook.createHook}
${hook.updateHook}
${hook.deleteHook}
    `;
    })
    .join("\n");

  return `// AUTO-GENERATED FILE - DO NOT EDIT
// Generated by drizzle-sync from backend schema
// Uses CUID2 for frontend ID generation
${imports}
${content}
`;
}
