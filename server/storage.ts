// Storage is handled directly via Drizzle ORM in routes.ts
// This file is kept as a placeholder for the IStorage interface pattern

export interface IStorage {}

export class MemStorage implements IStorage {}

export const storage = new MemStorage();
