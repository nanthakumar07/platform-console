import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Widget } from '../types/personalization';

interface DraggableWidgetProps {
  widget: Widget;
  children: React.ReactNode;
  onEdit?: (widget: Widget) => void;
  onDelete?: (widgetId: string) => void;
  onToggleVisibility?: (widgetId: string) => void;
  onToggleMinimize?: (widgetId: string) => void;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  widget,
  children,
  onEdit,
  onDelete,
  onToggleVisibility,
  onToggleMinimize,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-lg border border-gray-200 ${widget.isMinimized ? 'h-12' : ''}`}
    >
      <div
        className="flex items-center justify-between p-3 border-b border-gray-200 cursor-move"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center space-x-2">
          <div className="text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900">{widget.title}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize?.(widget.id);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility?.(widget.id);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(widget);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(widget.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      {!widget.isMinimized && widget.isVisible && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};

interface DashboardGridProps {
  widgets: Widget[];
  onWidgetUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetReorder: (widgets: Widget[]) => void;
  children: (widget: Widget) => React.ReactNode;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetReorder,
  children,
}) => {
  const [activeWidget, setActiveWidget] = useState<Widget | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const widget = widgets.find(w => w.id === active.id);
    setActiveWidget(widget || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex(w => w.id === active.id);
      const newIndex = widgets.findIndex(w => w.id === over?.id);

      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      onWidgetReorder(newWidgets);
    }

    setActiveWidget(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {widgets.map((widget) => (
            <DraggableWidget
              key={widget.id}
              widget={widget}
              onEdit={(widget) => onWidgetUpdate(widget.id, widget)}
              onDelete={onWidgetDelete}
              onToggleVisibility={(widgetId) => 
                onWidgetUpdate(widgetId, { isVisible: !widgets.find(w => w.id === widgetId)?.isVisible })
              }
              onToggleMinimize={(widgetId) => 
                onWidgetUpdate(widgetId, { isMinimized: !widgets.find(w => w.id === widgetId)?.isMinimized })
              }
            >
              {children(widget)}
            </DraggableWidget>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeWidget ? (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 opacity-90">
            <div className="flex items-center space-x-2 p-3 border-b border-gray-200">
              <div className="text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900">{activeWidget.title}</h3>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
