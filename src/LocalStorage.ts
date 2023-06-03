/** abstracted to improve testability */
export const localStorageGetItem = (key: string): string | null => localStorage.getItem(key);

/** abstracted to improve testability */
export const localStorageSetItem = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

/** abstracted to improve testability */
export const localStorageClear = (): void => {
  localStorage.clear();
};
