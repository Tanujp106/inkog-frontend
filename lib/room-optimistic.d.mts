export function mergeRoomRecord<T extends { clientActionId?: string; createdAt: string }>(records: T[], record: T, idField: keyof T): T[];
export function mergeRoomHistory<T extends { clientActionId?: string; createdAt: string }>(records: T[], incoming: T[], idField: keyof T): T[];
export function validateRoomPoll(question: string, options: string[]): string | null;
