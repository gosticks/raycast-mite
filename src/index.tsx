import { showToast, Toast } from "@raycast/api";
import TimeEntryForm, { TimeEntryFormProps } from "./components/TimeEntryForm";
import { useMiteClient } from "./utils";

export default function Command() {
  const miteClient = useMiteClient();

  const onSubmit: TimeEntryFormProps["onSubmit"] = async (data) => {
    const toast = await showToast({
      title: "Creating entry...",
      style: Toast.Style.Animated,
    });
    try {
      await miteClient.createTimeEntry({
        time_entry: {
          ...data,
        },
      });
      toast.title = "Entry created";
      toast.style = Toast.Style.Success;
    } catch (e) {
      toast.title = "Failed to add entry";
      toast.style = Toast.Style.Failure;
    } finally {
      setTimeout(() => toast.hide(), 3000);
    }
  };

  return <TimeEntryForm submitTitle="Add Entry" onSubmit={onSubmit} />;
}
