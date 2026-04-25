import { camelCase, pascalCase, snakeCase } from "../../utils/string-utils";
import type { EntitySyncConfig, RelationGraph, ColumnMetadata } from "../../config/types";
import type { SerializedEntity } from "../../config/schema-types";
import { buildRelationGraph } from "../../config/introspect";
import { getAllColumns, getGeneratorConfig } from "./schema-adapter";
import { CodeBuilder } from "./code-builder";

type HookEntity = EntitySyncConfig | SerializedEntity;

function isSerializedEntity(entity: HookEntity): entity is SerializedEntity {
  return "columns" in entity && "config" in entity;
}

function getEntityConfig(entity: HookEntity): Pick<EntitySyncConfig, "metadata" | "relations"> {
  if (isSerializedEntity(entity)) {
    return {
      metadata: entity.config.metadata,
      relations: entity.config.relations,
    };
  }

  return {
    metadata: entity.metadata,
    relations: entity.relations,
  };
}

function getGraphFromEntities(allEntities: Record<string, HookEntity>): RelationGraph {
  const graph: RelationGraph = {};

  const allSerialized = Object.values(allEntities).every((entity) => isSerializedEntity(entity));
  if (allSerialized) {
    for (const [name, entity] of Object.entries(allEntities)) {
      const serialized = entity as SerializedEntity;
      graph[name] = {
        parents: serialized.graph.parents,
        children: serialized.graph.children,
        priority: serialized.graph.priority,
      };
    }
    return graph;
  }

  const nonSerialized = Object.fromEntries(
    Object.entries(allEntities)
      .filter(([, entity]) => !isSerializedEntity(entity))
      .map(([name, entity]) => [name, { table: (entity as EntitySyncConfig).table }])
  );

  return Object.keys(nonSerialized).length > 0
    ? buildRelationGraph(nonSerialized)
    : {};
}

function getSortableColumns(entity: HookEntity): string[] {
  let columns: ColumnMetadata[];
  if (isSerializedEntity(entity)) {
    columns = entity.columns;
  } else {
    columns = getAllColumns(entity);
  }

  const sortableTypes = ["varchar", "text", "timestamp", "date", "integer", "serial"];
  return columns
    .filter((col) => sortableTypes.includes(col.dataType.toLowerCase()))
    .map((col) => camelCase(col.name));
}

function getFileFields(
  entity: HookEntity
): Record<string, { entity: "files" | "assets" }> {
  const fields: Record<string, { entity: "files" | "assets" }> = {};

  if (isSerializedEntity(entity)) {
    if (entity.config.fileFields) {
      Object.entries(entity.config.fileFields).forEach(([key, value]) => {
        fields[key] = value;
      });
    }
  } else {
    if (entity.fileFields) {
      Object.entries(entity.fileFields).forEach(([key, value]) => {
        fields[key] = value;
      });
    }
  }

  return fields;
}

export interface HookOutput {
  listHook: string;
  singleHook: string;
  createHook: string;
  updateHook: string;
  deleteHook: string;
}

export function generateHooks(
  entityName: string,
  entity: HookEntity,
  allEntities: Record<string, HookEntity>
): HookOutput {
  const config = getEntityConfig(entity);

  if (config.metadata?.isJunctionTable === true) {
    return {
      listHook: "",
      singleHook: "",
      createHook: "",
      updateHook: "",
      deleteHook: "",
    };
  }

  const pascalName = pascalCase(entityName);
  const serviceClassName = `${pascalName}Service`;
  const serviceName = entityName;
  const sortableColumns = getSortableColumns(entity);
  const emptyHooks = { listHook: "", singleHook: "", createHook: "", updateHook: "", deleteHook: "" };

  const graph = getGraphFromEntities(allEntities);
  const isChild = Object.values(allEntities).some((parentConfig) => {
    const relations = getEntityConfig(parentConfig).relations;
    return relations?.children?.some((c) => c.entity === entityName);
  });

  const listOptionsType = generateListOptionsType(entityName, sortableColumns);

  const fileFields = getFileFields(entity);
  const hasFileFields = Object.keys(fileFields).length > 0;

  const listHook = generateListHook(entityName, pascalName, serviceClassName, serviceName, listOptionsType);
  const singleHook = isChild ? "" : generateSingleHook(entityName, pascalName, serviceClassName, serviceName);
  const createHook = generateCreateHook(entityName, pascalName, serviceClassName, serviceName, hasFileFields ? fileFields : undefined);
  const updateHook = isChild ? "" : generateUpdateHook(entityName, pascalName, serviceClassName, serviceName, hasFileFields ? fileFields : undefined);
  const deleteHook = isChild ? "" : generateDeleteHook(entityName, pascalName, serviceClassName, serviceName);

  return { listHook, singleHook, createHook, updateHook, deleteHook };
}

function generateListOptionsType(entityName: string, sortableColumns: string[]): string {
  const pascalName = pascalCase(entityName);

  if (sortableColumns.length === 0) {
    return `export interface ${pascalName}ListOptions {
  search?: string;
  limit?: number;
  offset?: number;
}`;
  }

  const sortByUnion = sortableColumns.map((c) => `"${c}"`).join(" | ");

  return `export interface ${pascalName}ListOptions {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: ${sortByUnion};
  sortOrder?: "asc" | "desc";
}`;
}

function generateListHook(
  entityName: string,
  pascalName: string,
  serviceClassName: string,
  serviceName: string,
  listOptionsType: string
): string {
  return `
${listOptionsType}

export function use${pascalName}s(options?: ${pascalName}ListOptions) {
  const service = useEngineService<${serviceClassName}>("${serviceName}");

  return useQuery({
    queryKey: options ? ["${entityName}", "list", options] : ["${entityName}"],
    queryFn: async () => service.list(options),
  });
}
`;
}

function generateSingleHook(
  entityName: string,
  pascalName: string,
  serviceClassName: string,
  serviceName: string
): string {
  return `
export function use${pascalName}(id: string | null) {
  const service = useEngineService<${serviceClassName}>("${serviceName}");

  return useQuery({
    queryKey: id ? ["${entityName}", id] : ["${entityName}", "detail"],
    queryFn: async () => {
      if (!id) return null;
      return service.findById(id);
    },
    enabled: !!id,
  });
}
`;
}

function generateCreateHook(
  entityName: string,
  pascalName: string,
  serviceClassName: string,
  serviceName: string,
  fileFields?: Record<string, { entity: "files" | "assets" }>
): string {
  const fileProcessingCode = fileFields
    ? generateFileProcessingCode(fileFields, "input")
    : "";

  return `
export function useCreate${pascalName}() {
  const service = useEngineService<${serviceClassName}>("${serviceName}");
  const queryClient = useQueryClient();
${fileFields ? '  const [fileUploadState, setFileUploadState] = useState<Record<string, { status: "idle" | "uploading" | "pending" | "done" | "error"; progress: number }>>({});\n' : ''}
  return useMutation({
    mutationFn: async (inputParam: Create${pascalName}Input) => {
      let input = inputParam;
${fileProcessingCode}
      return service.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
    },
  });
}
`;
}

function generateFileProcessingCode(
  fileFields: Record<string, { entity: "files" | "assets" }>,
  inputVar: string
): string {
  const lines: string[] = [];
  lines.push(`      // Process file fields`);
  lines.push(`      const fileService = getFileUploadService();`);
  lines.push(`      let processedInput = { ...${inputVar} };`);

  for (const [fieldName, config] of Object.entries(fileFields)) {
    const camelField = camelCase(fieldName);
    lines.push(`      if ((${inputVar}.${camelField} as any) instanceof File) {`);
    lines.push(`        const fileId = createId();`);
    lines.push(`        const file = ${inputVar}.${camelField} as unknown as File;`);
    lines.push(`        await fileService.saveTemp(fileId, file, {`);
    lines.push(`          entityType: "${config.entity}",`);
    lines.push(`          fieldName: "${camelField}",`);
    lines.push(`          filename: file.name,`);
    lines.push(`          mimeType: file.type,`);
    lines.push(`          sizeBytes: file.size,`);
    lines.push(`        });`);
    lines.push(`        processedInput.${camelField} = fileId;`);
    lines.push(`      }`);
  }

  lines.push(`      ${inputVar} = processedInput;`);
  return lines.join("\n");
}

function generateUpdateHook(
  entityName: string,
  pascalName: string,
  serviceClassName: string,
  serviceName: string,
  fileFields?: Record<string, { entity: "files" | "assets" }>
): string {
  const fileProcessingCode = fileFields
    ? generateFileProcessingCode(fileFields, "input")
    : "";

  return `
export function useUpdate${pascalName}() {
  const service = useEngineService<${serviceClassName}>("${serviceName}");
  const queryClient = useQueryClient();
${fileFields ? '  const [fileUploadState, setFileUploadState] = useState<Record<string, { status: "idle" | "uploading" | "pending" | "done" | "error"; progress: number }>>({});\n' : ''}
  return useMutation({
    mutationFn: async ({ id, input: inputParam }: { id: string; input: Update${pascalName}Input }) => {
      let input = inputParam;
${fileProcessingCode}
      return service.update(id, input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
      queryClient.invalidateQueries({ queryKey: ["${entityName}", variables.id] });
    },
  });
}
`;
}

function generateDeleteHook(
  entityName: string,
  pascalName: string,
  serviceClassName: string,
  serviceName: string
): string {
  return `
export function useDelete${pascalName}() {
  const service = useEngineService<${serviceClassName}>("${serviceName}");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return service.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
    },
  });
}
`;
}

function shouldGenerateHooks(
  entityName: string,
  allEntities: Record<string, HookEntity>
): boolean {
  const config = getEntityConfig(allEntities[entityName]);

  if (config.metadata?.isJunctionTable === true) {
    return false;
  }

  for (const [, parentConfig] of Object.entries(allEntities)) {
    const children = getEntityConfig(parentConfig).relations?.children || [];
    if (children.some((c) => c.entity === entityName)) {
      return false;
    }
  }

  return true;
}

export function generateHooksFile(
  hooks: Map<string, HookOutput>,
  allEntities: Record<string, HookEntity>
): string {
  const entityNames = Array.from(hooks.keys()).filter((name) =>
    shouldGenerateHooks(name, allEntities)
  );

  const serviceImports = new Set<string>();
  const typeImports = new Set<string>();

  for (const entityName of entityNames) {
    const pascalName = pascalCase(entityName);
    serviceImports.add(`${pascalName}Service`);
    typeImports.add(`Create${pascalName}Input`);
    typeImports.add(`Update${pascalName}Input`);
  }

  const b = new CodeBuilder();
  b.line("// AUTO-GENERATED FILE - DO NOT EDIT");
  b.line("// Generated by drizzle-sync from backend schema");
  b.line("// Engine-first hooks using useEngineService + TanStack Query");
  b.blank();
  b.line('import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";');
  b.line('import { useEngineService } from "@avileo/drizzle-sync/react";');

  // Check if any entity has file fields
  const hasFileFields = entityNames.some((name) => {
    const entity = allEntities[name];
    return Object.keys(getFileFields(entity)).length > 0;
  });

  if (hasFileFields) {
    b.line('import { useState } from "react";');
    b.line('import { createId } from "@paralleldrive/cuid2";');
    b.line('import { getFileUploadService } from "@avileo/drizzle-sync/client";');
  }

  if (serviceImports.size > 0) {
    b.line("import {");
    b.indent((ib) => {
      Array.from(serviceImports).sort().forEach((s) => ib.line(`  ${s},`));
    });
    b.line('} from "./services";');
  }

  if (typeImports.size > 0) {
    b.line("import type {");
    b.indent((ib) => {
      Array.from(typeImports).sort().forEach((t) => ib.line(`  ${t},`));
    });
    b.line('} from "./services";');
  }

  b.blank();

  Array.from(hooks.entries())
    .filter(([name]) => shouldGenerateHooks(name, allEntities))
    .forEach(([name, hook]) => {
      b.line(`// ${pascalCase(name)} hooks`);
      appendHookBlock(b, hook.listHook);
      appendHookBlock(b, hook.singleHook);
      appendHookBlock(b, hook.createHook);
      appendHookBlock(b, hook.updateHook);
      appendHookBlock(b, hook.deleteHook);
      b.blank();
    });

  return b.toString();
}

function appendHookBlock(builder: CodeBuilder, block: string): void {
  const trimmed = block.trim();
  if (!trimmed) {
    return;
  }

  trimmed.split("\n").forEach((line) => builder.line(line));
  builder.blank();
}
