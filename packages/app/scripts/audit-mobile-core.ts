import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

type RuleId =
  | "fixed-bottom"
  | "padding-hack"
  | "legacy-shell-surface"
  | "legacy-card-shell"
  | "shell-raw-colors"
  | "card-footer-layout"
  | "form-page-standalone";

interface Violation {
  ruleId: RuleId;
  filePath: string;
  line: number;
  message: string;
  snippet: string;
}

interface AuditRule {
  id: RuleId;
  description: string;
  test(filePath: string, content: string): Violation[];
}

const packageRoot = process.cwd();

// Explicitly scoped to the routes migrated during the mobile-core refactor waves.
// This keeps the audit strict on the migrated surface without blocking unrelated legacy routes.
const MIGRATED_ROUTE_FILES = [
  "app/routes/login.tsx",
  "app/routes/register.tsx",
  "app/routes/_protected.clientes._index.tsx",
  "app/routes/_protected.ventas._index.tsx",
  "app/routes/_protected.distribuciones.tsx",
  "app/routes/_protected.visitas.tsx",
  "app/routes/_protected.productos._index.tsx",
  "app/routes/_protected.compras._index.tsx",
  "app/routes/_protected.proveedores._index.tsx",
  "app/routes/_protected.config.tags.tsx",
  "app/routes/_protected.config.puntos-venta.tsx",
  "app/routes/_protected.onboarding.data.tsx",
  "app/routes/_protected.compras.nueva.tsx",
  "app/routes/_protected.proveedores.nuevo.tsx",
  "app/routes/_protected.cobros.nuevo.tsx",
  "app/routes/_protected.clientes.nuevo.tsx",
  "app/routes/_protected.business.create.tsx",
  "app/routes/_protected.productos.nuevo.tsx",
  "app/routes/_protected.business.edit.tsx",
  "app/routes/_protected.proveedores.$id.edit.tsx",
  "app/routes/_protected.clientes.$id.edit.tsx",
  "app/routes/_protected.distribuciones.nueva._index.tsx",
  "app/routes/_protected.productos.$id.tsx",
  "app/routes/_protected.compras.$id.editar._index.tsx",
  "app/routes/_protected.compras.$id.tsx",
  "app/routes/_protected.ventas.$id._index.tsx",
  "app/routes/_protected.clientes.$id._index.tsx",
  "app/routes/_protected.grupos.$id._index.tsx",
  "app/routes/_protected.ventas.$id.editar.calculadora.tsx",
  "app/routes/_protected.compras.nueva.($draftId).calculadora.tsx",
  "app/routes/_protected.config.notifications.tsx",
  "app/routes/_protected.config.security.tsx",
  "app/routes/_protected.config.whatsapp.tsx",
  "app/routes/_protected.config.whatsapp.templates.tsx",
  "app/routes/_protected.config.appearance.tsx",
  "app/routes/_protected.config.flags.tsx",
  "app/routes/_protected.reportes.compras-sugeridas.tsx",
  "app/routes/_protected.reportes.cuentas-por-cobrar.tsx",
  "app/routes/_protected.reportes.alertas-stock.tsx",
  "app/routes/_protected.team.tsx",
  "app/routes/_protected.invitations.tsx",
  "app/routes/_protected.profile.tsx",
] as const;

// Primitive internals are intentionally allowed to use fixed positioning and shell variables.
// Fullscreen calculator routes are intentionally included in the migrated set but exempt from
// shell-surface checks because they render a deliberate overlay shell.
const PRIMITIVE_ALLOWLIST = new Set([
  "app/components/mobile/mobile-shell.tsx",
  "app/components/mobile/mobile-fixed-footer.tsx",
  "app/components/mobile/mobile-page.tsx",
  "app/components/mobile/mobile-slots.tsx",
]);

const FORM_SUPPORT_FILES = ["app/components/layout/form-page.tsx"] as const;

const FULLSCREEN_ROUTE_ALLOWLIST = new Set([
  "app/routes/_protected.ventas.$id.editar.calculadora.tsx",
  "app/routes/_protected.compras.nueva.($draftId).calculadora.tsx",
]);

const allAuditFiles = [
  ...MIGRATED_ROUTE_FILES,
  ...FORM_SUPPORT_FILES,
].map((filePath) => resolve(packageRoot, filePath));

function getRelativePath(filePath: string) {
  return relative(packageRoot, filePath).replaceAll("\\", "/");
}

function getLines(content: string) {
  return content.split(/\r?\n/);
}

function collectLineViolations(
  filePath: string,
  content: string,
  ruleId: RuleId,
  message: string,
  predicate: (line: string, lineNumber: number) => boolean
) {
  const relativePath = getRelativePath(filePath);

  return getLines(content).flatMap((line, index) => {
    if (!predicate(line, index + 1)) {
      return [];
    }

    return [{
      ruleId,
      filePath: relativePath,
      line: index + 1,
      message,
      snippet: line.trim(),
    } satisfies Violation];
  });
}

function isMigratedRoute(filePath: string) {
  const relativePath = getRelativePath(filePath);
  return MIGRATED_ROUTE_FILES.includes(relativePath as (typeof MIGRATED_ROUTE_FILES)[number]);
}

function isFullscreenException(filePath: string) {
  return FULLSCREEN_ROUTE_ALLOWLIST.has(getRelativePath(filePath));
}

function isPrimitiveInternal(filePath: string) {
  return PRIMITIVE_ALLOWLIST.has(getRelativePath(filePath));
}

const rules: AuditRule[] = [
  {
    id: "fixed-bottom",
    description: "Disallow ad-hoc fixed bottom positioning in migrated routes.",
    test(filePath, content) {
      if (!isMigratedRoute(filePath)) {
        return [];
      }

      return collectLineViolations(
        filePath,
        content,
        "fixed-bottom",
        "Route-level fixed bottom positioning must use MobileShell.Footer or MobileShell.FloatingAction.",
        (line) => /\bfixed\s+bottom-/.test(line)
      );
    },
  },
  {
    id: "padding-hack",
    description: "Disallow manual pb-24/pb-32 compensation in migrated routes and FormPage.",
    test(filePath, content) {
      const relativePath = getRelativePath(filePath);

      if (!isMigratedRoute(filePath) && relativePath !== "app/components/layout/form-page.tsx") {
        return [];
      }

      return collectLineViolations(
        filePath,
        content,
        "padding-hack",
        "Manual mobile bottom padding hacks are forbidden; rely on mobile-shell/footer spacing instead.",
        (line) => /\bpb-(24|32)\b/.test(line)
      );
    },
  },
  {
    id: "legacy-shell-surface",
    description: "Disallow old route-shell min-h-screen gray/white wrappers in migrated routes.",
    test(filePath, content) {
      if (!isMigratedRoute(filePath) || isFullscreenException(filePath)) {
        return [];
      }

      return collectLineViolations(
        filePath,
        content,
        "legacy-shell-surface",
        "Legacy route shell surface detected; use MobileShell/MobilePage surfaces instead of min-h-screen gray/white wrappers.",
        (line) => {
          if (!/\bmin-h-screen\b/.test(line)) {
            return false;
          }

          return /\bbg-(?:gray-50|white(?:\/\d+)?)\b/.test(line);
        }
      );
    },
  },
  {
    id: "legacy-card-shell",
    description: "Disallow legacy border-0 shadow-lg card shells in migrated routes.",
    test(filePath, content) {
      if (!isMigratedRoute(filePath)) {
        return [];
      }

      return collectLineViolations(
        filePath,
        content,
        "legacy-card-shell",
        "Legacy route card shell detected; use MobilePage.Card or semantic shell tokens instead of border-0 shadow-lg.",
        (line) =>
          /\bborder-0\b/.test(line) &&
          /(?:^|[\s"])shadow-lg(?:$|[\s"])/.test(line)
      );
    },
  },
  {
    id: "shell-raw-colors",
    description: "Disallow raw gray/white/stone shell colors layered on semantic shell primitives.",
    test(filePath, content) {
      if (!isMigratedRoute(filePath) || isFullscreenException(filePath)) {
        return [];
      }

      return collectLineViolations(
        filePath,
        content,
        "shell-raw-colors",
        "Semantic shell primitives should not be mixed with raw gray/white/stone shell colors in migrated routes.",
        (line) => {
          if (!/shell-(?:card|field|surface|block-muted)/.test(line)) {
            return false;
          }

          if (/\b(?:h|w)-\d+\b.*\b(?:h|w)-\d+\b/.test(line) && /\bbg-orange-/.test(line)) {
            return false;
          }

          return /(\bbg-white[^\s"]*|\bbg-gray-50[^\s"]*|\bborder-stone-[^\s"]*|\bborder-white[^\s"]*|\bhover:bg-white[^\s"]*)/.test(line);
        }
      );
    },
  },
  {
    id: "card-footer-layout",
    description: "Disallow CardFooter-based auth/form footers in migrated routes.",
    test(filePath, content) {
      if (!isMigratedRoute(filePath)) {
        return [];
      }

      return collectLineViolations(
        filePath,
        content,
        "card-footer-layout",
        "Route footers should use MobileFixedFooter or mobile slots instead of CardFooter layout wrappers.",
        (line) => /\bCardFooter\b/.test(line)
      );
    },
  },
  {
    id: "form-page-standalone",
    description: "Disallow standalone/default FormPage behavior from reappearing.",
    test(filePath, content) {
      if (getRelativePath(filePath) !== "app/components/layout/form-page.tsx") {
        return [];
      }

      return collectLineViolations(
        filePath,
        content,
        "form-page-standalone",
        "FormPage must stay as a mobile-core wrapper only; do not reintroduce standalone/default shell mode.",
        (line) => /\buseLayout\b|\bMobileShell\.Root\b|\bmin-h-screen\b|\bmin-h-dvh\b/.test(line)
      );
    },
  },
];

function ensureFilesExist() {
  const missingFiles = allAuditFiles.filter((filePath) => !Bun.file(filePath).exists());

  if (missingFiles.length === 0) {
    return;
  }

  console.error("Missing mobile-core audit files:");
  for (const filePath of missingFiles) {
    console.error(`  - ${getRelativePath(filePath)}`);
  }
  process.exit(1);
}

function readAuditFiles() {
  return allAuditFiles
    .filter((filePath) => !isPrimitiveInternal(filePath))
    .map((filePath) => ({
      filePath,
      content: readFileSync(filePath, "utf8"),
    }));
}

function runAudit() {
  ensureFilesExist();

  const files = readAuditFiles();
  const violations = files.flatMap(({ filePath, content }) =>
    rules.flatMap((rule) => rule.test(filePath, content))
  );

  if (violations.length === 0) {
    console.log(`✓ Mobile core audit passed (${files.length} files checked)`);
    return;
  }

  console.error(`✗ Mobile core audit failed with ${violations.length} violation(s)\n`);

  for (const violation of violations) {
    console.error(`[${violation.ruleId}] ${violation.filePath}:${violation.line}`);
    console.error(`  ${violation.message}`);
    console.error(`  ${violation.snippet}`);
    console.error("");
  }

  process.exit(1);
}

runAudit();
