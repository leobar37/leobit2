import type { ReactNode } from "react";
import { useBusinessMode } from "~/hooks/use-business-mode";
import type { BusinessModeFlags } from "@avileo/shared";

interface BusinessModeProps {
  /** Render children when mode matches */
  is?: string | string[];
  /** Render children when mode does NOT match */
  isNot?: string | string[];
  /** Render children when flag is enabled */
  flag?: keyof BusinessModeFlags | (keyof BusinessModeFlags)[];
  /** Render children when flag is NOT enabled */
  flagNot?: keyof BusinessModeFlags | (keyof BusinessModeFlags)[];
  /** Fallback rendered when condition is false */
  else?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current business mode or flags.
 *
 * @example
 * <BusinessMode is="agua">
 *   <ContainerExchange />
 * </BusinessMode>
 *
 * <BusinessMode flag="useTara">
 *   <TaraInput />
 * </BusinessMode>
 *
 * <BusinessMode is="polleria" else={<GenericTotal />}>
 *   <PolleriaTotal />
 * </BusinessMode>
 *
 * <BusinessMode isNot="agua">
 *   <NoAguaFeature />
 * </BusinessMode>
 */
export function BusinessMode({
  is,
  isNot,
  flag,
  flagNot,
  else: fallback,
  children,
}: BusinessModeProps) {
  const { mode, hasFlag } = useBusinessMode();

  let visible = true;

  if (is) {
    const modes = Array.isArray(is) ? is : [is];
    visible = visible && modes.includes(mode);
  }

  if (isNot) {
    const modes = Array.isArray(isNot) ? isNot : [isNot];
    visible = visible && !modes.includes(mode);
  }

  if (flag) {
    const flags = Array.isArray(flag) ? flag : [flag];
    visible = visible && flags.every((f) => hasFlag(f as keyof BusinessModeFlags));
  }

  if (flagNot) {
    const flags = Array.isArray(flagNot) ? flagNot : [flagNot];
    visible = visible && !flags.some((f) => hasFlag(f as keyof BusinessModeFlags));
  }

  return visible ? <>{children}</> : <>{fallback || null}</>;
}

interface BusinessModeFieldProps {
  /** Render children when this custom field is enabled for the current mode */
  field: string;
  children: ReactNode;
}

/**
 * Conditionally renders a field based on the mode's customCustomerFields config.
 *
 * @example
 * <BusinessModeField field="frequency">
 *   <FrequencySelect />
 * </BusinessModeField>
 */
export function BusinessModeField({ field, children }: BusinessModeFieldProps) {
  const { flags } = useBusinessMode();

  const visible = flags.customCustomerFields.includes(field);

  return visible ? <>{children}</> : null;
}
