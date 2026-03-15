import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Project, ProjectSummary, Layer } from '../types/project';
import type { Instrument, MetronomeMode, Note, TimeSignature } from '../types/music';
import * as storage from '../services/storage';

interface ProjectContextValue {
  currentProject: Project | null;
  projectList: ProjectSummary[];
  selectedLayerId: string | null;
  isLoading: boolean;
  createProject: (name: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  closeProject: () => void;
  deleteProject: (id: string) => Promise<void>;
  updateCurrentProject: (partial: Partial<Project>) => void;
  addLayer: (instrument: Instrument) => void;
  selectLayer: (layerId: string) => void;
  deleteLayer: (layerId: string) => void;
  updateLayerNotes: (layerId: string, notes: Note[]) => void;
  shiftOctave: (layerId: string, direction: 1 | -1) => void;
  setMetronomeMode: (mode: MetronomeMode) => void;
  setTempo: (bpm: number) => void;
  setTimeSignature: (ts: TimeSignature) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize DB and load project list
  useEffect(() => {
    storage
      .initDB()
      .then(() => storage.getAllProjects())
      .then((list) => {
        setProjectList(list);
        setIsLoading(false);
      })
      .catch(console.error);
  }, []);

  // Auto-save current project on change (debounced 500ms)
  useEffect(() => {
    if (!currentProject) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      storage.updateProject(currentProject).catch(console.error);
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [currentProject]);

  const createProject = useCallback(async (name: string) => {
    const project = await storage.createProject(name);
    setCurrentProject(project);
    setSelectedLayerId(null);
    setProjectList((prev) => [
      { id: project.id, name: project.name, updatedAt: project.updatedAt },
      ...prev,
    ]);
  }, []);

  const openProject = useCallback(async (id: string) => {
    const project = await storage.getProject(id);
    if (project) {
      setCurrentProject(project);
      setSelectedLayerId(project.layers[0]?.id ?? null);
    }
  }, []);

  const closeProject = useCallback(() => {
    setCurrentProject(null);
    setSelectedLayerId(null);
    storage.getAllProjects().then(setProjectList).catch(console.error);
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await storage.deleteProject(id);
    setProjectList((prev) => prev.filter((p) => p.id !== id));
    setCurrentProject((prev) => (prev?.id === id ? null : prev));
    setSelectedLayerId(null);
  }, []);

  const updateCurrentProject = useCallback((partial: Partial<Project>) => {
    setCurrentProject((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const addLayer = useCallback((instrument: Instrument) => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      instrument,
      octaveShift: 0,
      notes: [],
    };
    setCurrentProject((prev) =>
      prev ? { ...prev, layers: [...prev.layers, newLayer] } : null
    );
    setSelectedLayerId(newLayer.id);
  }, []);

  const selectLayer = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
  }, []);

  const deleteLayer = useCallback((layerId: string) => {
    setCurrentProject((prev) => {
      if (!prev) return null;
      return { ...prev, layers: prev.layers.filter((l) => l.id !== layerId) };
    });
    setSelectedLayerId((prev) => (prev === layerId ? null : prev));
  }, []);

  const updateLayerNotes = useCallback((layerId: string, notes: Note[]) => {
    setCurrentProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        layers: prev.layers.map((l) => (l.id === layerId ? { ...l, notes } : l)),
      };
    });
  }, []);

  const shiftOctave = useCallback((layerId: string, direction: 1 | -1) => {
    setCurrentProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        layers: prev.layers.map((l) =>
          l.id === layerId
            ? { ...l, octaveShift: Math.max(-3, Math.min(3, l.octaveShift + direction)) }
            : l
        ),
      };
    });
  }, []);

  const setMetronomeMode = useCallback((mode: MetronomeMode) => {
    setCurrentProject((prev) => (prev ? { ...prev, metronomeMode: mode } : null));
  }, []);

  const setTempo = useCallback((bpm: number) => {
    setCurrentProject((prev) => (prev ? { ...prev, tempo: bpm } : null));
  }, []);

  const setTimeSignature = useCallback((ts: TimeSignature) => {
    setCurrentProject((prev) => (prev ? { ...prev, timeSignature: ts } : null));
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projectList,
        selectedLayerId,
        isLoading,
        createProject,
        openProject,
        closeProject,
        deleteProject,
        updateCurrentProject,
        addLayer,
        selectLayer,
        deleteLayer,
        updateLayerNotes,
        shiftOctave,
        setMetronomeMode,
        setTempo,
        setTimeSignature,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectContext must be used inside <ProjectProvider>');
  return ctx;
}
