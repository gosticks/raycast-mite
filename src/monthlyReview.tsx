import { Detail } from "@raycast/api";
import { MiteTimeEntryResponse } from "mite-api-ts";
import { useEffect, useState } from "react";
import { useMiteClient } from "./utils";

export default function Command() {
  const [entries, setEntries] = useState<MiteTimeEntryResponse[]>([]);
  const client = useMiteClient();

  useEffect(() => {
    const date = new Date();
    client
      .getMiteTimeEntries(date.getFullYear(), date.getMonth() + 1)
      .then((entries) => {
        setEntries(entries);
      })
      .catch((e) => {
        console.error(e);
        setEntries([]);
      });
  }, []);

  return (
    <Detail
      markdown={`
  # Monthly Review
  Total Entries: ${entries.length}\n
  Time: ${entries.reduce((acc, entry) => acc + entry.time_entry.minutes, 0) / 60}h\n
  `}
    />
  );
}
