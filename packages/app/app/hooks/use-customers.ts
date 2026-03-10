// Re-export from use-live-customers for backward compatibility
export { 
  useCustomers, 
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer 
} from "./use-live-customers";
export type { Customer } from "~/lib/db/schema";
