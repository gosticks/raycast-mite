import { Detail } from "@raycast/api";
import { MiteTimeEntry, MiteTimeEntryResponse } from "mite-api-ts";
import { useEffect, useState } from "react";
import { useMiteClient } from "./utils";
import { getHolidays, HolidayItem } from "./utils/holidays";

type WeekArray = [number, number, number, number, number, number, number];

const WORKING_WEEK_CONFIG: WeekArray = [8, 8, 8, 8, 8, 0, 0];

// This script is released to the public domain and may be used, modified and
// distributed without restrictions. Attribution not necessary but appreciated.
// Source: https://weeknumber.com/how-to/javascript

// Returns the ISO week of the date.
const getWeek = (date: Date) => {
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  // January 4 is always in week 1.
  const week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
};

const getDaysOfWeekBetweenDates = (sDate = "2022-01-01", eDate = new Date().toISOString().substring(0, 10)) => {
  let startDate = new Date(sDate);
  const endDate = new Date(eDate);

  endDate.setDate(endDate.getDate() + 1);

  const daysOfWeek: WeekArray = [0, 0, 0, 0, 0, 0, 0];

  while (startDate < endDate) {
    // we need to switch this since getDay() returns 0 for Sunday
    daysOfWeek[startDate.getDay() == 0 ? 6 : startDate.getDay() - 1] += 1;
    startDate = new Date(startDate.getTime() + 1000 * 60 * 60 * 24);
  }

  return daysOfWeek;
};

const getTotalWorkTimeRequired = async (
  // use 2 when timezone is UTC+2
  from = new Date(new Date().getFullYear(), 0, new Date().getTimezoneOffset() < 0 ? 1 : 2)
    .toISOString()
    .substring(0, 10),
  to: string = new Date().toISOString().substring(0, 10),
  workTimes: WeekArray = WORKING_WEEK_CONFIG
) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const days = getDaysOfWeekBetweenDates(from, to);

  // subtract hollidays
  const holidaysFrom = await getHolidays(new Date(from).getFullYear());
  const holidaysTo = await getHolidays(new Date(to).getFullYear());
  const holidays = holidaysFrom.feiertage.concat(holidaysTo.feiertage);
  const accountedHolidays: Array<
    HolidayItem & {
      hoursReduced: number;
    }
  > = [];
  holidays.forEach((holiday) => {
    const day = new Date(holiday.date);
    if (day >= fromDate && day <= toDate) {
      const dayIndex = day.getDay() == 0 ? 6 : day.getDay() - 1;
      days[dayIndex] -= 1;
      accountedHolidays.push({ ...holiday, hoursReduced: workTimes[dayIndex] });
    }
  });
  // compute total hours
  return {
    total: days.reduce((acc, cur, index) => {
      return acc + cur * workTimes[index];
    }, 0),
    days,
    holidays,
    accountedHolidays,
  };
};

export default function Command() {
  const [entries, setEntries] = useState<MiteTimeEntryResponse[]>([]);
  const client = useMiteClient();
  const [totalWorkTime, setTotalWorkTime] = useState<Awaited<ReturnType<typeof getTotalWorkTimeRequired>>>();
  const totalWorkedTime = entries.reduce((acc, entry) => acc + entry.time_entry.minutes, 0) / 60;
  const overtime = totalWorkedTime - (totalWorkTime?.total ?? 0);
  const longestTimeEntry = entries.reduce(
    (prev, cur) => ((prev?.time_entry.minutes ?? 0) < cur.time_entry.minutes ? cur : prev),
    undefined as MiteTimeEntryResponse | undefined
  );

  const D = Detail as any;

  const metadata = (
    <D.Metadata>
      <D.Metadata.Label
        title="Weekly Split (hours per weekday)"
        text={`${WORKING_WEEK_CONFIG[0]} ${WORKING_WEEK_CONFIG[1]} ${WORKING_WEEK_CONFIG[2]} ${WORKING_WEEK_CONFIG[3]} ${WORKING_WEEK_CONFIG[4]} ${WORKING_WEEK_CONFIG[5]} ${WORKING_WEEK_CONFIG[6]}`}
      />
      <D.Metadata.Label
        title="Weekly avg. (should vs actual)"
        text={`${WORKING_WEEK_CONFIG.reduce((acc, cur) => acc + cur, 0)}h / ${(
          totalWorkedTime / getWeek(new Date())
        ).toFixed(2)}h`}
      />
      <D.Metadata.Label
        title={`Longest entry (${(longestTimeEntry?.time_entry.minutes ?? 0) / 60}h)`}
        text={`${longestTimeEntry?.time_entry.note} `}
      />
    </D.Metadata>
  ) as any;

  useEffect(() => {
    getTotalWorkTimeRequired().then((resp) => setTotalWorkTime(resp));
    client
      .getYearlyTimeEntries(new Date().getFullYear())
      .then((entries) => {
        setEntries(entries);
      })
      .catch((e) => {
        console.error(e);
        setEntries([]);
      });
  }, []);
  return (
    <D
      metadata={metadata}
      markdown={`
  # Yearly Review (${new Date().getFullYear()})\n\n
  Total mite entries: **${entries.length}**\n
  --------------------------------------------------
  Total yearly time: **${totalWorkedTime.toFixed(2)}h**\n
  --------------------------------------------------
  Total should have worked: **${totalWorkTime?.total ?? "loading..."}h**\n
  Accounted hollidays: **${totalWorkTime?.accountedHolidays.length ?? "loading..."}**\n 
  ${totalWorkTime?.accountedHolidays?.map((holiday) => `${holiday.fname}(${holiday.date})\n`) ?? "loading..."}
  --------------------------------------------------
  Overtime: ${overtime.toFixed(2)}h -> ${(overtime / 8).toFixed(2)}days\n
  `}
    />
  );
}
