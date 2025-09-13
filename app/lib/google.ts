// This file is now deprecated - using Firebase Auth with Google scopes instead
// All calendar functionality has been moved to seller.ts

export const initGoogleApi = () => {
  console.log("initGoogleApi is deprecated - using Firebase Auth instead");
  return Promise.resolve();
};

export const getFreeBusy = async (timeMin: string, timeMax: string) => {
  console.log("getFreeBusy is deprecated - use the function from seller.ts instead");
  return { calendars: { primary: { busy: [] } } };
};

export const createEvent = async (summary: string, start: string, end: string) => {
  console.log("createEvent is deprecated - use the function from seller.ts instead");
  return { id: "deprecated", summary, start: { dateTime: start }, end: { dateTime: end } };
};
