import { LocalStorage, showToast, ActionPanel, Action, Form, Toast, Icon } from "@raycast/api";
import { MiteClient, MiteService, MiteProject, MiteTimeEntry } from "mite-api-ts";
import { useEffect, useState } from "react";
import { parseMiteDateAt, parseTime, roundTime, toHours, useMiteClient } from "../utils";

type RawSubmitPayload = {
  note: string;
  date: Date;
  projectId: string;
  serviceId: string;
  duration: string;
  rountTime?: boolean;
};

export type TimeEntrySubmitPayload = Partial<MiteTimeEntry>;

type TimeEntryFormState = {
  services: MiteService[];
  projects: MiteProject[];
};

export type TimeEntryFormProps = {
  initialValues?: MiteTimeEntry;
  submitTitle: string;
  onSubmit: (data: TimeEntrySubmitPayload) => Promise<void>;
} & Partial<Form.Props>;

export type RecentTimeEntry = {
  projectId: string;
  serviceId: string;
};

export const reloadEntries = (miteClient: MiteClient) => {
  return Promise.all([miteClient.getActiveProjects(), miteClient.getActiveServices()]);
};

const localStorageKey = "recent-time-entry";

const loadRecentEntryData = async (): Promise<RecentTimeEntry | undefined> => {
  const rawRecentEntry = await LocalStorage.getItem(localStorageKey);
  return typeof rawRecentEntry === "string" ? JSON.parse(rawRecentEntry) : undefined;
};

export default function TimeEntryForm({ initialValues, onSubmit, submitTitle, ...formProps }: TimeEntryFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<TimeEntryFormState>({ services: [], projects: [] });
  const miteClient = useMiteClient();
  const [recentSelection, setRecentSelection] = useState<RecentTimeEntry | undefined>();

  const [duration, setDuration] = useState<string>();

  useEffect(() => {
    setIsLoading(true);
    Promise.all([miteClient.getActiveProjects(), miteClient.getActiveServices()])
      .then(([projects, services]) => {
        setState({ services, projects });
      })
      .catch((e) => {
        setState({ services: [], projects: [] });
        showToast({
          title: "Failed to load mite data for customer",
          message: e,
        });
      })
      .finally(() => setIsLoading(false));

    // reload recent values
    loadRecentEntryData().then((values) => setRecentSelection(values));
  }, [miteClient]);

  const handleSubmit = async (data: RawSubmitPayload) => {
    setIsLoading(true);

    let parsedTime = parseTime(data.duration);

    if (parsedTime <= 0) {
      const toast = new Toast({ title: "Time entry invalid, failed to parse duration", style: Toast.Style.Failure });
      toast.show();
      setTimeout(() => toast.hide(), 2000);
      setIsLoading(false);
      return;
    }

    if (data.rountTime) {
      parsedTime = roundTime(parsedTime);
    }
    try {
      await onSubmit({
        ...(initialValues ?? {}),
        minutes: parsedTime,
        project_id: parseInt(data.projectId),
        service_id: parseInt(data.serviceId),
        note: data.note,
        date_at: data.date,
      });

      // reset duration to prevent the form from being submitted again
      setDuration("");

      LocalStorage.setItem(
        localStorageKey,
        JSON.stringify({
          projectId: data.projectId,
          serviceId: data.serviceId,
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle="Create new mite entry"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      {...formProps}
    >
      <Form.DatePicker
        defaultValue={initialValues?.date_at ? parseMiteDateAt(initialValues.date_at) : new Date()}
        id="date"
        title="Entry day"
      />
      <Form.Dropdown
        storeValue
        id="projectId"
        title="Project"
        defaultValue={initialValues?.project_id ? initialValues?.project_id + "" : recentSelection?.projectId}
      >
        {state.projects?.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id + ""}
            title={project.name}
            icon={recentSelection?.projectId === project.id + "" ? Icon.Star : undefined}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown
        storeValue
        id="serviceId"
        title="Service"
        defaultValue={initialValues?.service_id ? initialValues?.service_id + "" : recentSelection?.serviceId}
      >
        {state.services?.map((service) => (
          <Form.Dropdown.Item
            key={service.id}
            value={service.id + ""}
            title={service.name}
            icon={recentSelection?.serviceId === service.id + "" ? Icon.Star : undefined}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        defaultValue={initialValues?.minutes ? toHours(initialValues.minutes) : undefined}
        id="duration"
        value={duration}
        onChange={setDuration}
        title="Duration"
      />
      <Form.Description text="formats hh:mm or mm" />
      <Form.TextArea id="note" defaultValue={initialValues?.note} title="Note" />
      <Form.Checkbox id="roundTime" defaultValue={true} label="Round time" />
    </Form>
  );
}
