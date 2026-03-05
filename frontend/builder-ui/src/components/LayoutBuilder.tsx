import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Save, Grid, Layout as LayoutIcon, Eye, Edit3, Undo, Redo, Copy, Settings, Monitor } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { layoutService, Layout, LayoutComponent } from '../services/layoutService';
import { ResponsivePreview } from './ResponsivePreview';
import { ComponentConfigPanel } from './ComponentConfigPanel';
import { LayoutTemplates } from './LayoutTemplates';
import { useLayoutUndoRedo } from '../hooks/useUndoRedo';

const componentTypes = {
  header: {
    icon: LayoutIcon,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultWidth: 12,
    defaultHeight: 2,
    configFields: ['title', 'subtitle', 'navigation']
  },
  sidebar: {
    icon: Grid,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    defaultWidth: 3,
    defaultHeight: 8,
    configFields: ['menuItems', 'collapsible']
  },
  content: {
    icon: LayoutIcon,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    defaultWidth: 9,
    defaultHeight: 6,
    configFields: ['contentType', 'dataSource']
  },
  footer: {
    icon: LayoutIcon,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    defaultWidth: 12,
    defaultHeight: 2,
    configFields: ['links', 'copyright']
  },
  card: {
    icon: Grid,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    defaultWidth: 4,
    defaultHeight: 3,
    configFields: ['title', 'content', 'actions']
  },
  form: {
    icon: Edit3,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    defaultWidth: 6,
    defaultHeight: 4,
    configFields: ['formId', 'fields', 'validation']
  },
  table: {
    icon: Grid,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    defaultWidth: 8,
    defaultHeight: 4,
    configFields: ['dataSource', 'columns', 'pagination']
  },
  chart: {
    icon: Grid,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultWidth: 6,
    defaultHeight: 4,
    configFields: ['chartType', 'dataSource', 'options']
  }
};

export const LayoutBuilder: React.FC = () => {
  const { hasPermission } = useAuth();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<LayoutComponent | null>(null);
  const [, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'preview' | 'templates'>('design');
  const [gridSize] = useState(20);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Initialize undo/redo functionality
  const undoRedo = useLayoutUndoRedo(selectedLayout || {} as Layout);

  // Load layouts on component mount
  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      const fetchedLayouts = await layoutService.getLayouts();
      setLayouts(fetchedLayouts);
    } catch (error) {
      console.error('Failed to load layouts:', error);
    }
  };

  const saveLayout = async () => {
    if (!selectedLayout) return;
    
    try {
      const updatedLayout = {
        ...selectedLayout,
        updatedAt: new Date().toISOString(),
        version: selectedLayout.version + 1
      };
      
      if (selectedLayout.id.startsWith('temp_')) {
        // Create new layout
        const savedLayout = await layoutService.createLayout(updatedLayout);
        setSelectedLayout(savedLayout);
        setLayouts(layouts.map(l => l.id === selectedLayout.id ? savedLayout : l));
      } else {
        // Update existing layout
        const savedLayout = await layoutService.updateLayout(selectedLayout.id, updatedLayout);
        setSelectedLayout(savedLayout);
        setLayouts(layouts.map(l => l.id === selectedLayout.id ? savedLayout : l));
      }
      
      setIsEditing(false);
      console.log('Layout saved successfully');
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  };

  const handleTemplateSelect = async (template: any) => {
    try {
      const newLayout = await layoutService.createLayoutFromTemplate(
        template.id,
        `${template.name} - ${Date.now()}`
      );
      setLayouts([...layouts, newLayout]);
      setSelectedLayout(newLayout);
      setShowTemplates(false);
    } catch (error) {
      console.error('Failed to create layout from template:', error);
    }
  };

  const createNewLayout = () => {
    const newLayout: Layout = {
      id: Date.now().toString(),
      name: 'New Layout',
      description: 'Describe your layout here',
      components: [],
      gridSettings: {
        columns: 12,
        rowHeight: 60,
        margin: [10, 10],
        containerPadding: [20, 20]
      },
      settings: {
        isResponsive: true,
        breakpoints: {
          mobile: 768,
          tablet: 1024,
          desktop: 1280
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      tags: []
    };
    setLayouts([...layouts, newLayout]);
    setSelectedLayout(newLayout);
    setIsEditing(true);
  };

  const addComponent = (type: LayoutComponent['type']) => {
    if (!selectedLayout) return;

    const componentType = componentTypes[type];
    const newComponent: LayoutComponent = {
      id: `component_${Date.now()}`,
      type,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      width: componentType.defaultWidth,
      height: componentType.defaultHeight,
      x: 0,
      y: 0,
      config: {}
    };

    const updatedLayout = {
      ...selectedLayout,
      components: [...selectedLayout.components, newComponent]
    };

    setSelectedLayout(updatedLayout);
    setLayouts(layouts.map(l => l.id === selectedLayout.id ? updatedLayout : l));
  };

  const updateComponent = (componentId: string, updates: Partial<LayoutComponent>) => {
    if (!selectedLayout) return;

    const updatedLayout = {
      ...selectedLayout,
      components: selectedLayout.components.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      )
    };

    setSelectedLayout(updatedLayout);
    setLayouts(layouts.map(l => l.id === selectedLayout.id ? updatedLayout : l));
  };

  const deleteComponent = (componentId: string) => {
    if (!selectedLayout) return;

    const updatedLayout = {
      ...selectedLayout,
      components: selectedLayout.components.filter(comp => comp.id !== componentId)
    };

    setSelectedLayout(updatedLayout);
    setLayouts(layouts.map(l => l.id === selectedLayout.id ? updatedLayout : l));
    setSelectedComponent(null);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !selectedLayout) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === 'components' && destination.droppableId === 'canvas') {
      const componentType = draggableId as keyof typeof componentTypes;
      addComponent(componentType);
    } else if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
      const components = Array.from(selectedLayout.components);
      const [reorderedItem] = components.splice(source.index, 1);
      components.splice(destination.index, 0, reorderedItem);

      const updatedLayout = {
        ...selectedLayout,
        components
      };

      setSelectedLayout(updatedLayout);
      setLayouts(layouts.map(l => l.id === selectedLayout.id ? updatedLayout : l));
    }
  };

  const updateGridSettings = (updates: Partial<Layout['gridSettings']>) => {
    if (!selectedLayout) return;

    const updatedLayout = {
      ...selectedLayout,
      gridSettings: {
        ...selectedLayout.gridSettings,
        ...updates
      }
    };

    setSelectedLayout(updatedLayout);
    setLayouts(layouts.map(l => l.id === selectedLayout.id ? updatedLayout : l));
  };

  if (!hasPermission('metadata:read')) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">
              You don't have permission to access layouts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Layout Builder</h1>
          <p className="mt-2 text-gray-600">
            Design layouts for your objects and forms.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={createNewLayout}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Layout
          </button>
        </div>
      </div>

      {!selectedLayout ? (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Layouts</h3>
            {layouts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No layouts found. Create your first layout to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {layouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedLayout(layout)}
                  >
                    <h4 className="font-medium text-gray-900">{layout.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{layout.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {layout.components.length} components
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        layout.settings.isResponsive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {layout.settings.isResponsive ? 'Responsive' : 'Fixed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSelectedLayout(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ← Back
                </button>
                <div>
                  <input
                    type="text"
                    value={selectedLayout.name}
                    onChange={(e) => setSelectedLayout({...selectedLayout, name: e.target.value})}
                    className="text-lg font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                  <input
                    type="text"
                    value={selectedLayout.description}
                    onChange={(e) => setSelectedLayout({...selectedLayout, description: e.target.value})}
                    className="text-sm text-gray-500 bg-transparent border-none focus:outline-none focus:ring-0 mt-1"
                    placeholder="Add description..."
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('design')}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      activeTab === 'design' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 inline mr-1" />
                    Design
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      activeTab === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      activeTab === 'templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <Grid className="w-4 h-4 inline mr-1" />
                    Templates
                  </button>
                </div>
                
                {/* Undo/Redo buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => undoRedo.undo()}
                    disabled={!undoRedo.canUndo}
                    className={`p-2 rounded ${
                      undoRedo.canUndo 
                        ? 'text-gray-600 hover:bg-gray-200' 
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title="Undo"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => undoRedo.redo()}
                    disabled={!undoRedo.canRedo}
                    className={`p-2 rounded ${
                      undoRedo.canRedo 
                        ? 'text-gray-600 hover:bg-gray-200' 
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title="Redo"
                  >
                    <Redo className="w-4 h-4" />
                  </button>
                </div>
                
                <button
                  onClick={saveLayout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'design' && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex">
                <div className="w-64 border-r border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Components</h3>
                  <Droppable droppableId="components" isDropDisabled={true}>
                    {(provided, snapshot) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef} 
                        className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}`}
                      >
                        {Object.entries(componentTypes).map(([type, config], index) => {
                          const Icon = config.icon;
                          return (
                            <Draggable key={type} draggableId={type} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 rounded-lg border-2 cursor-move transition-all ${
                                    config.bgColor
                                  } ${config.borderColor} ${
                                    snapshot.isDragging ? 'shadow-lg opacity-75 rotate-2' : 'hover:shadow-md'
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging 
                                      ? `${provided.draggableProps.style?.transform || ''} rotate(2deg)` 
                                      : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <div className={`w-6 h-6 ${config.color} rounded-md flex items-center justify-center mx-auto mb-2`}>
                                    <Icon className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="text-xs font-medium text-gray-900 text-center">
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* Component Configuration Panel */}
                  {selectedComponent && (
                    <ComponentConfigPanel
                      component={selectedComponent}
                      onUpdate={(componentId, updates) => {
                        updateComponent(componentId, updates);
                        setSelectedComponent({...selectedComponent, ...updates});
                      }}
                      onDelete={(componentId) => {
                        deleteComponent(componentId);
                        setSelectedComponent(null);
                      }}
                      onClose={() => setSelectedComponent(null)}
                    />
                  )}
                </div>

                <div className="flex-1">
                  <div className="p-4">
                    <div
                      className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg min-h-96"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                        `,
                        backgroundSize: `${gridSize}px ${gridSize}px`
                      }}
                    >
                      <Droppable droppableId="canvas">
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`relative h-full ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${selectedLayout.gridSettings.columns}, 1fr)`,
                              gap: `${selectedLayout.gridSettings.margin[0]}px`,
                              padding: `${selectedLayout.gridSettings.containerPadding[0]}px`,
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            {selectedLayout.components.map((component, index) => {
                              const componentType = componentTypes[component.type];
                              const Icon = componentType.icon;
                              const isSelected = selectedComponent?.id === component.id;

                              return (
                                <Draggable key={component.id} draggableId={component.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`relative rounded-lg border-2 cursor-move transition-all duration-200 ${
                                        componentType.bgColor
                                      } ${componentType.borderColor} ${
                                        isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                                      } ${snapshot.isDragging ? 'shadow-2xl opacity-80 scale-95 rotate-1' : 'hover:shadow-lg hover:scale-105'}`}
                                      style={{
                                        ...provided.draggableProps.style,
                                        gridColumn: `span ${component.width}`,
                                        gridRow: `span ${component.height}`,
                                        minHeight: `${component.height * selectedLayout.gridSettings.rowHeight}px`,
                                        transform: snapshot.isDragging 
                                          ? `${provided.draggableProps.style?.transform || ''} rotate(1deg) scale(0.95)` 
                                          : provided.draggableProps.style?.transform,
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        zIndex: snapshot.isDragging ? 1000 : isSelected ? 10 : 1
                                      }}
                                      onClick={() => setSelectedComponent(component)}
                                    >
                                      {/* Selection indicator */}
                                      {isSelected && !snapshot.isDragging && (
                                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                          <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                      )}
                                      
                                      <div className={`w-8 h-8 ${componentType.color} rounded-md flex items-center justify-center mx-auto mb-2`}>
                                        <Icon className="w-5 h-5 text-white" />
                                      </div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {component.name}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {component.width} × {component.height}
                                      </div>
                                      
                                      {/* Drag handle indicator */}
                                      <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                                        <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
                                          <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                </div>
              </div>
            </DragDropContext>
          )}

          {activeTab === 'preview' && (
            <div className="p-6">
              <ResponsivePreview
                layout={selectedLayout}
                onDeviceChange={(device) => console.log('Device changed:', device)}
              />
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="p-6">
              <LayoutTemplates
                onSelectTemplate={handleTemplateSelect}
                onCreateFromTemplate={async (template, layoutName) => {
                  const newLayout = await layoutService.createLayoutFromTemplate(template.id, layoutName);
                  setLayouts([...layouts, newLayout]);
                  setSelectedLayout(newLayout);
                  setActiveTab('design');
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
