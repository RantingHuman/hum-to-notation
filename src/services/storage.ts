import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Layer, Project, ProjectSummary } from '../types/project';
import type { Instrument } from '../types/music';

interface HumDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
}

let db: IDBPDatabase<HumDB>;

export async function initDB(): Promise<void> {
  db = await openDB<HumDB>('hum-to-notation', 1, {
    upgrade(database) {
      database.createObjectStore('projects', { keyPath: 'id' });
    },
  });
}

function getDB(): IDBPDatabase<HumDB> {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  return db;
}

export class StorageQuotaError extends Error {
  constructor() {
    super('Storage quota exceeded. Export your projects and delete old ones to free space.');
    this.name = 'StorageQuotaError';
  }
}

function wrapQuotaError(err: unknown): never {
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    throw new StorageQuotaError();
  }
  throw err;
}

export function createLayer(instrument: Instrument): Layer {
  return { id: crypto.randomUUID(), instrument, octaveShift: 0, notes: [] };
}

/** New projects start with a guitar layer so recording is one tap away. */
export async function createProject(name: string): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    tempo: 100,
    timeSignature: { numerator: 4, denominator: 4 },
    metronomeMode: 'visual',
    createdAt: now,
    updatedAt: now,
    layers: [createLayer('guitar')],
  };
  await getDB().add('projects', project).catch(wrapQuotaError);
  return project;
}

export async function getProject(id: string): Promise<Project | undefined> {
  return getDB().get('projects', id);
}

export async function getAllProjects(): Promise<ProjectSummary[]> {
  const all = await getDB().getAll('projects');
  return all
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function updateProject(project: Project): Promise<void> {
  await getDB().put('projects', { ...project, updatedAt: new Date().toISOString() }).catch(wrapQuotaError);
}

export async function deleteProject(id: string): Promise<void> {
  await getDB().delete('projects', id);
}
