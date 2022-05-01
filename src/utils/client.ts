import { getPreferenceValues, PreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { useMemo } from "react";
import { MiteClient, MiteTimeEntry, MiteTimeEntryResponse } from "mite-api-ts";

const MITE_APP_NAME = "raycast-www-v0";

type MiteAtOption = "today" | "this_week" | "this_month" | "this_year" | "last_year" | "last_month";

export const getEntryUrl = (entry: MiteTimeEntry) => {
  const preferences = getPreferenceValues();
  // ts-mite typings are incorrect API returns a string with YYYY-MM-DD here
  const dateParts = (entry.date_at as unknown as string).split("-");
  return `https://${preferences.team}.mite.yo.lk/daily#${dateParts[0]}/${dateParts[1]}/${dateParts[2]}?open=time_entry_${entry.id}`;
};

// extension of the default mite client since some methods are absent
class CustomMiteClient extends MiteClient {
  constructor(private team: string, private token: string) {
    super(MITE_APP_NAME, team, token);
  }

  private async request(endpoint: string, method = "GET", payload: object | undefined = undefined) {
    console.log(`https://${this.team}.mite.yo.lk${endpoint}`);
    return fetch(`https://${this.team}.mite.yo.lk${endpoint}`, {
      headers: {
        "X-MiteAccount": this.team,
        "X-MiteApiKey": this.token,
        "Content-Type": "application/json",
      },
      method,
      body: payload ? JSON.stringify(payload) : undefined,
    });
  }

  async getMyEntries(at: MiteAtOption = "this_month") {
    return this.request(`/time_entries.json?user_id=current&at=${at}`).then(
      (res) => res.json() as Promise<MiteTimeEntryResponse[]>
    );
  }

  async getMyEntriesGroupedByDay(at?: MiteAtOption) {
    return this.getMyEntries(at).then((entries) =>
      entries.reduce(
        (acc, cur) => ({
          ...acc,
          [cur.time_entry.date_at as unknown as string]: acc[cur.time_entry.date_at as unknown as string]
            ? [...acc[cur.time_entry.date_at as unknown as string], cur]
            : [cur],
        }),
        {} as Record<string, MiteTimeEntryResponse[]>
      )
    );
  }

  async getYearlyTimeEntries(year: number) {
    return this.request(`/time_entries.json?user_id=current&from=${year}-${1}-01&to=${year}-${12}-31`).then(
      (res) => res.json() as Promise<MiteTimeEntryResponse[]>
    );
  }

  async getMiteTimeEntries(year: number, month: number) {
    return this.request(`/time_entries.json?user_id=current&from=${year}-${month}-01&to=${year}-${month}-31`).then(
      (res) => res.json() as Promise<MiteTimeEntryResponse[]>
    );
  }

  async updateTimeEntry(entryId: number, diff: Partial<MiteTimeEntry>) {
    return this.request(`/time_entries/${entryId}.json`, "PATCH", { time_entry: diff });
  }

  async deleteTimeEntry(entryId: number) {
    return this.request(`/time_entries/${entryId}.json`, "DELETE");
  }
}

export const useMiteClient = () => {
  const preferences = getPreferenceValues<PreferenceValues>();
  const miteClient = useMemo(
    () => new CustomMiteClient(preferences.team, preferences.token),
    [preferences.token, preferences.team]
  );
  return miteClient;
};
