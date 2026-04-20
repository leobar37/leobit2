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
  // Skip junction tables - they're managed through parent entities, not standalone endpoints
  if (config.metadata?.isJunctionTable === true) {
    return {
      listHook: "",
      singleHook: "",
      createHook: "",
      updateHook: "",
      deleteHook: "",
    };
  }

  const graph = buildRelationGraph(allEntities);
  const hasChildren = graph[entityName]?.children.length > 0;
  // Use apiPath if provided, otherwise fall back to entity name
  const apiPath = config.apiPath || entityName;

  return {
    listHook: generateListHook(entityName, apiPath),
    singleHook: generateSingleHook(entityName, apiPath),
    createHook: hasChildren
      ? generateCreateWithChildren(entityName, config, graph, allEntities, apiPath)
      : generateSimpleCreate(entityName, apiPath),
    updateHook: generateUpdateHook(entityName, apiPath),
    deleteHook: generateDeleteHook(entityName, apiPath),
  };
}

function generateListHook(entityName: string, apiPath: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function use${pascalName}List() {
  return useQuery({
    queryKey: ["${entityName}"],
    queryFn: async () => {
      const { data, error } = await api.${apiPath}.get();
      if (error) throw new Error(String(error.value));
      return ${entityName}Schema.array().parse(data);
    },
  });
}
`;
}

function generateSingleHook(entityName: string, apiPath: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function use${pascalName}(id: string) {
  return useQuery({
    queryKey: ["${entityName}", id],
    queryFn: async () => {
      const { data, error } = await api.${apiPath}({ id }).get();
      if (error) throw new Error(String(error.value));
      return ${entityName}Schema.parse(data);
    },
    enabled: !!id,
  });
}
`;
}

function generateSimpleCreate(entityName: string, apiPath: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function useCreate${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: ${pascalName}Input) => {
      // Generate CUID2 - this IS the real ID
      const id = createId();
      
      const response = await api.${apiPath}.post({
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
  allEntities: Record<string, EntitySyncConfig>,
  apiPath: string
): string {
  const pascalName = pascalCase(entityName);
  // Filter out junction tables and child entities without standalone endpoints
  // Junction tables are managed through the sync batch, not standalone endpoints
  const children = (graph[entityName]?.children || []).filter((child) => {
    const childConfig = allEntities[child];
    // Skip junction tables - they're managed differently
    if (childConfig.metadata?.isJunctionTable === true) {
      return false;
    }
    return true;
  });

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
        localVersion: 1,
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
    mutationFn: async (input: ${pascalName}Input & { ${children.map((c) => `${c}?: ${pascalCase(c)}Input[]`).join("; ")} }) => {
      // 1. Generate CUID2 for parent (this IS the real ID)
      const parentId = createId();
      
      // 2. Build parent operation (uses FK-based ordering via payload references)
      const parentOp = {
        idempotencyKey: generateIdempotencyKey(),
        entityType: "${entityName}",
        operation: "create" as const,
        entityId: parentId,
        payload: { ...input, id: parentId },
        localVersion: 1,
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

function generateUpdateHook(entityName: string, apiPath: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function useUpdate${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<${pascalName}Input> }) => {
      const response = await api.${apiPath}({ id }).put(data);
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

function generateDeleteHook(entityName: string, apiPath: string): string {
  const pascalName = pascalCase(entityName);

  return `
export function useDelete${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.${apiPath}({ id }).delete();
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

/**
 * Check if an entity should have standalone hooks generated.
 * Entities that are junction tables or children in relations
 * should NOT have standalone hooks - they're managed through parent entities.
 */
function shouldGenerateHooks(
  entityName: string,
  allEntities: Record<string, EntitySyncConfig>
): boolean {
  const config = allEntities[entityName];

  // Skip junction tables - they're managed through parent entities
  if (config.metadata?.isJunctionTable === true) {
    return false;
  }

  // Skip child entities (defined in any parent's relations.children)
  for (const [parentName, parentConfig] of Object.entries(allEntities)) {
    if (parentName === entityName) continue;
    const children = parentConfig.relations?.children || [];
    if (children.some((c) => c.entity === entityName)) {
      return false;
    }
  }

  return true;
}

export function generateHooksFile(
  hooks: Map<string, HookOutput>,
  allEntities: Record<string, EntitySyncConfig>
): string {
  // Filter out entities that shouldn't have standalone hooks
  const entityNames = Array.from(hooks.keys()).filter((name) =>
    shouldGenerateHooks(name, allEntities)
  );

  const imports = `
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { createId } from "@paralleldrive/cuid2";
import { 
  ${entityNames.map((e) => `${e}Schema`).join(", ")}
} from "./schemas";
import type { 
  ${entityNames.map((e) => `${pascalCase(e)}Input`).join(", ")}
} from "./types";
import { generateIdempotencyKey } from "@avileo/shared";
`;

  const content = Array.from(hooks.entries())
    .filter(([name]) => shouldGenerateHooks(name, allEntities))
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
