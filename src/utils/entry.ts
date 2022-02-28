import { MiteTimeEntry } from "mite-api-ts";

export const createTemplateFromEntry = (entry: MiteTimeEntry): Partial<MiteTimeEntry> => {
  const newPartialEntry: Partial<MiteTimeEntry> = {
    note: entry.note,
    customer_id: entry.customer_id,
    customer_name: entry.customer_name,
    project_id: entry.project_id,
    project_name: entry.project_name,
    service_id: entry.service_id,
    service_name: entry.service_name,
    user_id: entry.user_id,
    user_name: entry.user_name,
  };

  return newPartialEntry;
};
