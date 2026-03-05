import { useState, useCallback } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UndoRedoActions<T> {
  state: UndoRedoState<T>;
  set: (state: T) => void;
  undo: () => void;
  redo: () => void;
  reset: (initialState: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useUndoRedo = <T>(initialState: T): UndoRedoActions<T> => {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  const undo = useCallback(() => {
    setState(currentState => {
      if (currentState.past.length === 0) return currentState;
      
      const { past, present, future } = currentState;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      
      return {
        past: newPast,
        present: previous,
        future: [present, ...future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.future.length === 0) return currentState;
      
      const { past, present, future } = currentState;
      const next = future[0];
      const newFuture = future.slice(1);
      
      return {
        past: [...past, present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const set = useCallback((newPresent: T) => {
    setState(currentState => ({
      past: [...currentState.past, currentState.present],
      present: newPresent,
      future: []
    }));
  }, [setState]);

  const reset = useCallback((newInitialState: T) => {
    setState({
      past: [],
      present: newInitialState,
      future: []
    });
  }, []);

  return {
    state,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0
  };
};

// Hook for tracking layout-specific changes with detailed history
export const useLayoutUndoRedo = (initialLayout: any) => {
  const undoRedo = useUndoRedo(initialLayout);
  
  const addComponent = useCallback((component: any) => {
    const newLayout = {
      ...undoRedo.state.present,
      components: [...undoRedo.state.present.components, component]
    };
    undoRedo.set(newLayout);
  }, [undoRedo]);

  const updateComponent = useCallback((componentId: string, updates: any) => {
    const newLayout = {
      ...undoRedo.state.present,
      components: undoRedo.state.present.components.map((comp: any) =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      )
    };
    undoRedo.set(newLayout);
  }, [undoRedo]);

  const deleteComponent = useCallback((componentId: string) => {
    const newLayout = {
      ...undoRedo.state.present,
      components: undoRedo.state.present.components.filter((comp: any) => comp.id !== componentId)
    };
    undoRedo.set(newLayout);
  }, [undoRedo]);

  const reorderComponents = useCallback((components: any[]) => {
    const newLayout = {
      ...undoRedo.state.present,
      components
    };
    undoRedo.set(newLayout);
  }, [undoRedo]);

  const updateLayoutSettings = useCallback((updates: any) => {
    const newLayout = {
      ...undoRedo.state.present,
      ...updates
    };
    undoRedo.set(newLayout);
  }, [undoRedo]);

  return {
    ...undoRedo,
    layout: undoRedo.state.present,
    addComponent,
    updateComponent,
    deleteComponent,
    reorderComponents,
    updateLayoutSettings
  };
};
