/** Zero-width space: appended to a repeated message so the live region changes and it is spoken again. */
const REPEAT_MARK = "​";

/** What a live region shows next: `text`, marked when it repeats what the region already shows. */
export const nextLiveMessage = (previous: string, text: string): string => (previous === text ? `${text}${REPEAT_MARK}` : text);
