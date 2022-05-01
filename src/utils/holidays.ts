import fetch from "node-fetch";

export type HolidayItem = {
  date: string;
  fname: string;
  all_state: "1" | "0";
  comment: string;
};

type HolidayResp = {
  status: string;
  feiertage: Array<HolidayItem>;
};

export const getHolidays = async (year: number): Promise<HolidayResp> => {
  return fetch(`https://get.api-feiertage.de?years=${year}&states=by`).then(
    (res) => res.json() as Promise<HolidayResp>
  );
};
