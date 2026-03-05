import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { LayoutComponent } from '../services/layoutService';

interface EnhancedDragDropProps {
  components: LayoutComponent[];
  onDragEnd: (result: DragEndEvent) => void;
  onDragStart: (component: LayoutComponent) => void;
  onDragUpdate: (component: LayoutComponent) => void;
  selectedComponent: LayoutComponent | null;
  gridSettings: {
    columns: number;
    rowHeight: number;
    margin: [number, number];
  };
}

const DragPreview: React.FC<{
  component: LayoutComponent;
}> = ({ component }) => {
  const componentStyles: Record<string, React.CSSProperties> = {
    header: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 'bold',
      minWidth: '120px',
      textAlign: 'center'
    },
    sidebar: {
      backgroundColor: '#6b7280',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '11px',
      minWidth: '80px',
      textAlign: 'center'
    },
    content: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      minWidth: '100px',
      textAlign: 'center'
    },
    footer: {
      backgroundColor: '#8b5cf6',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      minWidth: '120px',
      textAlign: 'center'
    },
    card: {
      backgroundColor: '#6366f1',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '8px',
      fontSize: '11px',
      minWidth: '80px',
      textAlign: 'center'
    },
    form: {
      backgroundColor: '#eab308',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '8px',
      fontSize: '11px',
      minWidth: '80px',
      textAlign: 'center'
    },
    table: {
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '8px',
      fontSize: '11px',
      minWidth: '80px',
      textAlign: 'center'
    },
    chart: {
      backgroundColor: '#f97316',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '8px',
      fontSize: '11px',
      minWidth: '80px',
      textAlign: 'center'
    }
  };

  const style = componentStyles[component.type] || componentStyles.content;

  return (
    <div
      className="pointer-events-none z-50 opacity-80"
      style={{
        ...style,
        position: 'fixed',
        transform: 'rotate(5deg) scale(0.95)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(255, 255, 255, 0.8)',
        borderRadius: '8px'
      }}
    >
      <div className="text-xs font-medium truncate">
        {component.name}
      </div>
      <div className="text-xs opacity-75 mt-1">
        {component.width} × {component.height}
      </div>
    </div>
  );
};

export const EnhancedDragDrop: React.FC<EnhancedDragDropProps> = ({
  components,
  onDragEnd,
  onDragStart,
  onDragUpdate,
  selectedComponent,
  gridSettings
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id as string);
    const component = components.find(c => c.id === active.id);
    if (component) {
      onDragStart(component);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = components.findIndex((c) => c.id === active.id);
      const newIndex = components.findIndex((c) => c.id === over.id);
      
      const newComponents = arrayMove(components, oldIndex, newIndex);
      onDragEnd(event);
    }

    setActiveId(null);
  };

  const componentStyles: Record<string, React.CSSProperties> = {
    header: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontWeight: 'bold',
      fontSize: '14px'
    },
    sidebar: {
      backgroundColor: '#6b7280',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '13px'
    },
    content: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px'
    },
    footer: {
      backgroundColor: '#8b5cf6',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px'
    },
    card: {
      backgroundColor: '#6366f1',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '13px'
    },
    form: {
      backgroundColor: '#eab308',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '13px'
    },
    table: {
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '13px'
    },
    chart: {
      backgroundColor: '#f97316',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '13px'
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {/* Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(229, 231, 235, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(229, 231, 235, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * gridSettings.rowHeight}px ${20 * gridSettings.rowHeight}px`,
            backgroundPosition: `${gridSettings.margin[1]}px ${gridSettings.margin[0]}px`
          }}
        />

        {/* Sortable Components */}
        <SortableContext
          items={components.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div id="layout-canvas" className="relative">
            {components.map((component) => {
              const style = componentStyles[component.type] || componentStyles.content;
              const isSelected = selectedComponent?.id === component.id;
              const isDragging = activeId === component.id;

              return (
                <div
                  key={component.id}
                  className={`absolute transition-all duration-200 cursor-move ${
                    isSelected ? 'z-30' : 'z-20'
                  } ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-105'}`}
                  style={{
                    ...style,
                    gridColumn: `span ${component.width}`,
                    gridRow: `span ${component.height}`,
                    minHeight: `${component.height * gridSettings.rowHeight}px`,
                    boxShadow: isSelected 
                      ? '0 0 0 3px rgba(99, 102, 241, 0.3)' 
                      : isDragging 
                        ? '0 20px 40px rgba(0, 0, 0, 0.25)' 
                        : '0 4px 6px rgba(0, 0, 0, 0.1)',
                    border: isSelected 
                      ? '2px solid #6366f1' 
                      : '1px solid rgba(255, 255, 255, 0.8)',
                    borderRadius: '8px',
                    transform: isDragging ? 'rotate(2deg)' : 'rotate(0deg)',
                    touchAction: 'none',
                    userSelect: 'none'
                  }}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-sm font-medium text-white mb-1">
                      {component.name}
                    </div>
                    <div className="text-xs opacity-75">
                      {component.width} × {component.height}
                    </div>
                  </div>

                  {/* Resize Handles */}
                  {isSelected && !isDragging && (
                    <>
                      <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-600 cursor-nw-resize" style={{ transform: 'translate(50%, -50%)' }} />
                      <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-600 cursor-ne-resize" style={{ transform: 'translate(50%, -50%)' }} />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-600 cursor-se-resize" style={{ transform: 'translate(50%, 50%)' }} />
                      <div className="absolute bottom-0 left-0 w-3 h-3 bg-indigo-600 cursor-sw-resize" style={{ transform: 'translate(-50%, 50%)' }} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            (() => {
              const component = components.find(c => c.id === activeId);
              if (!component) return null;
              return <DragPreview component={component} />;
            })()
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};
