import * as React from "react";
import {
  useForm,
  FormProvider,
  type UseFormProps,
  type UseFormReturn,
  type FieldValues,
} from "react-hook-form";
import type {
  FieldResolver,
  FieldResolverContext,
  WrapperFieldMap,
} from "~/lib/forms/field-resolvers";

export interface UseWrapperFormOptions<TValues extends FieldValues>
  extends UseFormProps<TValues> {
  fields?: WrapperFieldMap<TValues>;
}

export interface WrappedForm<TValues extends FieldValues>
  extends UseFormReturn<TValues> {
  fields: WrapperFieldMap<TValues>;
  resolvePayload: (values?: TValues) => Promise<TValues>;
  resolveField: <K extends keyof TValues>(
    name: K,
    value?: TValues[K]
  ) => Promise<TValues[K]>;
  getFieldResolver: <K extends keyof TValues>(
    name: K
  ) => FieldResolver | undefined;
  handleResolvedSubmit: (
    callback: (payload: TValues) => void | Promise<void>
  ) => ReturnType<UseFormReturn<TValues>["handleSubmit"]>;
}

const WrapperFormContext = React.createContext<WrappedForm<FieldValues> | null>(
  null
);

export function useWrapperFormContext<TValues extends FieldValues = FieldValues>(): WrappedForm<TValues> | null {
  return React.useContext(WrapperFormContext) as WrappedForm<TValues> | null;
}

export function useWrapperFormContextOrThrow<TValues extends FieldValues = FieldValues>(): WrappedForm<TValues> {
  const ctx = React.useContext(WrapperFormContext) as WrappedForm<TValues> | null;
  if (!ctx) {
    throw new Error("useWrapperFormContext must be used within a WrapperFormProvider");
  }
  return ctx;
}

export function useWrapperForm<TValues extends FieldValues>(
  options: UseWrapperFormOptions<TValues> = {}
): WrappedForm<TValues> {
  const { fields = {}, ...formOptions } = options;
  const form = useForm<TValues>(formOptions);

  const getFieldResolver = React.useCallback(
    <K extends keyof TValues>(name: K): FieldResolver | undefined => {
      return (fields as Record<string, FieldResolver | undefined>)[name as string];
    },
    [fields]
  );

  const resolveField = React.useCallback(
    async <K extends keyof TValues>(
      name: K,
      value?: TValues[K]
    ): Promise<TValues[K]> => {
      const fieldValue = value !== undefined ? value : form.getValues(name as unknown as Parameters<typeof form.getValues>[0]);
      const resolver = getFieldResolver(name);
      if (!resolver) return fieldValue as TValues[K];

      const context: FieldResolverContext = {};
      const resolved = await resolver.toServer(fieldValue, context);
      return resolved as TValues[K];
    },
    [form, getFieldResolver]
  );

  const resolvePayload = React.useCallback(
    async (values?: TValues): Promise<TValues> => {
      const currentValues = values ?? form.getValues();
      const payload = { ...currentValues } as TValues;

      const entries = Object.entries(fields) as [
        keyof TValues,
        FieldResolver
      ][];

      for (const [name, resolver] of entries) {
        if (!resolver) continue;
        const value = currentValues[name];
        const context: FieldResolverContext = {};
        const resolved = await resolver.toServer(value, context);
        (payload as Record<keyof TValues, unknown>)[name] = resolved;
      }

      return payload;
    },
    [form, fields]
  );

  const handleResolvedSubmit = React.useCallback(
    (callback: (payload: TValues) => void | Promise<void>) => {
      return form.handleSubmit(async (rawValues: TValues) => {
        const payload = await resolvePayload(rawValues);
        await callback(payload);
      });
    },
    [form, resolvePayload]
  );

  const wrappedForm = React.useMemo(
    () => ({
      ...form,
      fields,
      resolvePayload,
      resolveField,
      getFieldResolver,
      handleResolvedSubmit,
    }),
    [form, fields, resolvePayload, resolveField, getFieldResolver, handleResolvedSubmit]
  );

  return wrappedForm as WrappedForm<TValues>;
}

export interface WrapperFormProviderProps<TValues extends FieldValues> {
  form: WrappedForm<TValues>;
  children: React.ReactNode;
}

export function WrapperFormProvider<TValues extends FieldValues>({
  form,
  children,
}: WrapperFormProviderProps<TValues>) {
  const formReturn = form as unknown as UseFormReturn<FieldValues>;
  return (
    React.createElement(
      WrapperFormContext.Provider,
      { value: form as WrappedForm<FieldValues> },
      React.createElement(FormProvider, { ...formReturn, children })
    )
  );
}
