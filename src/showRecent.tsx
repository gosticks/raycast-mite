import { ActionPanel, Action, Color, List, Icon, showToast } from "@raycast/api";
import { MiteTimeEntryResponse, MiteTrackingTimeEntry } from "mite-api-ts";
import { useEffect, useState } from "react";
import EditEntry from "./components/EditEntry";
import { toHours } from "./utils";
import { getEntryUrl, useMiteClient } from "./utils/client";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [entriesGrouped, setEntries] = useState<Record<string, MiteTimeEntryResponse[]>>();
  const [tracker, setTracker] = useState<MiteTrackingTimeEntry | null>(null);
  const client = useMiteClient();

  useEffect(() => {
    setIsLoading(true);
    Promise.all([client.getMyEntriesGroupedByDay(), client.getTracker()])
      .then(([entries, tracker]) => {
        setEntries(entries ?? []);
        setTracker(tracker?.tracking_time_entry ?? null);
      })
      .catch((e) => {
        console.error(e);
        showToast({ title: "failed to load", message: "Failed to load mite data for customer" });
      })
      .finally(() => setIsLoading(false));
  }, [client]);

  const onToggleTracker = async (id: number) => {
    setIsLoading(true);
    try {
      const updatedTracker = await client[id === tracker?.id ? "stopTracker" : "startTracker"](id);
      setTracker(updatedTracker?.tracking_time_entry ?? null);
    } catch {
      showToast({ title: "failed to set tracker", message: "Failed to set tracker" });
    } finally {
      setIsLoading(false);
    }
  };

  const onDeleteEntry = async (id: number) => {
    setIsLoading(true);
    try {
      await client.deleteTimeEntry(id);
      // setEntries((entries) => entries?[]((entry) => entry.time_entry.id !== id));
    } catch {
      showToast({ title: "failed to delete entry", message: "Failed to set tracker" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <List isLoading={isLoading}>
        {entriesGrouped &&
          Object.entries(entriesGrouped).map(([date, entries]) => (
            <List.Section
              title={date}
              subtitle={`(${toHours(entries.reduce((acc, cur) => acc + cur.time_entry.minutes, 0))})`}
            >
              {entries?.map(({ time_entry: entry }) => (
                <List.Item
                  icon={{
                    source: tracker?.id === entry.id ? Icon.Clock : Icon.Checkmark,
                    tintColor: tracker?.id === entry.id ? Color.Yellow : Color.Blue,
                  }}
                  key={entry.id}
                  keywords={[entry.note]}
                  title={`${entry.project_name} / ${entry.project_name}`}
                  subtitle={entry.note}
                  accessoryTitle={toHours(entry.minutes)}
                  actions={
                    <ActionPanel title="Modify">
                      <Action.Push target={<EditEntry entry={entry} />} title="Edit" icon={Icon.Pencil} />
                      {entry.date_at && <Action.OpenInBrowser url={getEntryUrl(entry)} title="Open in Mite" />}
                      <Action.SubmitForm
                        icon={{
                          source: tracker?.id === entry.id ? Icon.XmarkCircle : Icon.Clock,
                        }}
                        title={tracker?.id === entry.id ? "Stop tracking" : "Start tracking"}
                        onSubmit={() => onToggleTracker(entry.id)}
                      />

                      <Action.Trash
                        icon={{
                          source: Icon.Trash,
                        }}
                        title="Delete"
                        paths={[entry.id + ""]}
                        onTrash={() => onDeleteEntry(entry.id)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))}
      </List>
    </>
  );
}
