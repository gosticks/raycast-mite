export const parseTime = (timeString: string) => {
  const regex = /^(?:(?:(?:(\d+):)?(\d+))|(?:(?:(\d+)h)?(?:(\d+)m)?))$/;
  const matches = timeString.trim().match(regex);
  console.log("matches", matches, matches?.length);
  if (matches?.length !== 5) {
    return -1;
  }
  return parseInt(matches[1] ?? "0", 10) * 60 + parseInt(matches[2] ?? "0", 10);
};

export const roundTime = (time: number, step = 15) => time - (time % step) + (time % step > step / 2 ? step : 0);

export const parseMiteDateAt = (dateAt: Date) => {
  // ts-mite typings are incorrect API returns a string with YYYY-MM-DD here
  const dateParts = (dateAt as unknown as string).split("-");
  const date = new Date();
  date.setFullYear(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
  return date;
};

export const toHours = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${minutes % 60 !== 0 ? `${minutes % 60}` : "00"}`;
