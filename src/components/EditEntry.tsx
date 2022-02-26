import { showToast, Toast } from "@raycast/api";
import { MiteTimeEntry } from "mite-api-ts";
import TimeEntryForm, { TimeEntryFormProps } from "./TimeEntryForm";
import { useMiteClient } from "../utils";

export default function EditEntry(props: { entry: MiteTimeEntry }) {
  const miteClient = useMiteClient();

  const onSubmit: TimeEntryFormProps["onSubmit"] = async (data) => {
    const toast = await showToast({
      title: "Updating entry...",
      style: Toast.Style.Animated,
    });
    try {
      await miteClient.updateTimeEntry(props.entry.id, data);
      toast.title = "Entry updated";
      toast.style = Toast.Style.Success;
    } catch (e) {
      toast.title = "Failed to update entry";
      toast.style = Toast.Style.Failure;
    } finally {
      setTimeout(() => toast.hide(), 3000);
    }
  };

  return <TimeEntryForm submitTitle="Update entry" onSubmit={onSubmit} initialValues={props.entry} />;
}
