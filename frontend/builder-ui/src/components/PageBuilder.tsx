import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Save, Eye, Edit3, Code, Layers, Type, Image, Video, Square, Grid3x3 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface PageComponent {
  id: string;
  type: 'header' | 'navigation' | 'hero' | 'text' | 'image' | 'video' | 'button' | 'form' | 'card' | 'gallery' | 'footer';
  name: string;
  content: Record<string, any>;
  styles: {
    backgroundColor?: string;
    textColor?: string;
    padding?: string;
    margin?: string;
    borderRadius?: string;
    border?: string;
  };
  position: number;
}

interface Page {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  components: PageComponent[];
  settings: {
    isPublished: boolean;
    seoTitle?: string;
    seoDescription?: string;
    theme: 'light' | 'dark' | 'custom';
    layout: 'default' | 'centered' | 'full-width';
  };
}

const componentCategories = {
  layout: {
    name: 'Layout',
    icon: Layers,
    components: ['header', 'navigation', 'footer']
  },
  content: {
    name: 'Content',
    icon: Type,
    components: ['hero', 'text', 'image', 'video']
  },
  interactive: {
    name: 'Interactive',
    icon: Square,
    components: ['button', 'form']
  },
  display: {
    name: 'Display',
    icon: Grid3x3,
    components: ['card', 'gallery']
  }
};

const componentDefinitions = {
  header: {
    icon: Layers,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultContent: {
      title: 'Welcome to Our Website',
      subtitle: 'Amazing things happen here',
      logo: '/logo.png'
    }
  },
  navigation: {
    icon: Layers,
    color: 'bg-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    defaultContent: {
      menuItems: [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
        { label: 'Services', href: '/services' },
        { label: 'Contact', href: '/contact' }
      ]
    }
  },
  hero: {
    icon: Type,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    defaultContent: {
      title: 'Build Something Amazing',
      description: 'Create beautiful pages with our drag-and-drop builder',
      backgroundImage: '/hero-bg.jpg',
      ctaText: 'Get Started',
      ctaLink: '/signup'
    }
  },
  text: {
    icon: Type,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    defaultContent: {
      text: 'This is a text block. You can edit this content to say whatever you want.',
      fontSize: 'base',
      alignment: 'left'
    }
  },
  image: {
    icon: Image,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    defaultContent: {
      src: '/placeholder-image.jpg',
      alt: 'Placeholder image',
      caption: 'Image caption here'
    }
  },
  video: {
    icon: Video,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    defaultContent: {
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      title: 'Video title',
      autoplay: false,
      controls: true
    }
  },
  button: {
    icon: Square,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    defaultContent: {
      text: 'Click Me',
      href: '#',
      variant: 'primary',
      size: 'medium'
    }
  },
  form: {
    icon: Edit3,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultContent: {
      title: 'Contact Form',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: false }
      ],
      submitText: 'Submit'
    }
  },
  card: {
    icon: Grid3x3,
    color: 'bg-pink-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    defaultContent: {
      title: 'Card Title',
      description: 'This is a card description. Cards are great for highlighting important information.',
      image: '/card-image.jpg',
      actions: [{ text: 'Learn More', href: '#' }]
    }
  },
  gallery: {
    icon: Grid3x3,
    color: 'bg-teal-500',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
    defaultContent: {
      images: [
        { src: '/gallery1.jpg', alt: 'Gallery image 1' },
        { src: '/gallery2.jpg', alt: 'Gallery image 2' },
        { src: '/gallery3.jpg', alt: 'Gallery image 3' },
        { src: '/gallery4.jpg', alt: 'Gallery image 4' }
      ],
      columns: 4
    }
  },
  footer: {
    icon: Layers,
    color: 'bg-gray-800',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    defaultContent: {
      copyright: '© 2024 Your Company. All rights reserved.',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' }
      ]
    }
  }
};

export const PageBuilder: React.FC = () => {
  const { hasPermission } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<PageComponent | null>(null);
  const [, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'preview' | 'code'>('design');
  const [expandedCategory, setExpandedCategory] = useState<string>('layout');

  const createNewPage = () => {
    const newPage: Page = {
      id: Date.now().toString(),
      name: 'New Page',
      slug: 'new-page',
      title: 'New Page',
      description: 'Describe your page here',
      components: [],
      settings: {
        isPublished: false,
        theme: 'light',
        layout: 'default'
      }
    };
    setPages([...pages, newPage]);
    setSelectedPage(newPage);
    setIsEditing(true);
  };

  const addComponent = (type: PageComponent['type']) => {
    if (!selectedPage) return;

    // Ensure type is a string
    const typeString = String(type);
    const componentDef = componentDefinitions[type];
    
    if (!componentDef) {
      console.error('Component type not found:', type);
      return;
    }

    const newComponent: PageComponent = {
      id: `component_${Date.now()}`,
      type,
      name: `New ${typeString.charAt(0).toUpperCase() + typeString.slice(1)}`,
      content: { ...componentDef.defaultContent },
      styles: {},
      position: selectedPage.components.length
    };

    const updatedPage = {
      ...selectedPage,
      components: [...selectedPage.components, newComponent]
    };

    setSelectedPage(updatedPage);
    setPages(pages.map(p => p.id === selectedPage.id ? updatedPage : p));
  };

  const updateComponent = (componentId: string, updates: Partial<PageComponent>) => {
    if (!selectedPage) return;

    const updatedPage = {
      ...selectedPage,
      components: Array.isArray(selectedPage.components) ? selectedPage.components.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      ) : []
    };

    setSelectedPage(updatedPage);
    setPages(pages.map(p => p.id === selectedPage.id ? updatedPage : p));
  };

  const deleteComponent = (componentId: string) => {
    if (!selectedPage) return;

    const updatedPage = {
      ...selectedPage,
      components: selectedPage.components.filter(comp => comp.id !== componentId)
    };

    setSelectedPage(updatedPage);
    setPages(pages.map(p => p.id === selectedPage.id ? updatedPage : p));
    setSelectedComponent(null);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !selectedPage) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === 'components' && destination.droppableId === 'canvas') {
      // draggableId contains the component type string
      const componentType = draggableId as PageComponent['type'];
      addComponent(componentType);
    } else if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
      const components = Array.from(selectedPage.components);
      const [reorderedItem] = components.splice(source.index, 1);
      components.splice(destination.index, 0, reorderedItem);

      const updatedPage = {
        ...selectedPage,
        components: components.map((comp, index) => ({ ...comp, position: index }))
      };

      setSelectedPage(updatedPage);
      setPages(pages.map(p => p.id === selectedPage.id ? updatedPage : p));
    }
  };

  const savePage = () => {
    if (!selectedPage) return;
    
    console.log('Saving page:', selectedPage);
    setIsEditing(false);
  };

  const publishPage = () => {
    if (!selectedPage) return;

    const updatedPage = {
      ...selectedPage,
      settings: {
        ...selectedPage.settings,
        isPublished: true
      }
    };

    setSelectedPage(updatedPage);
    setPages(pages.map(p => p.id === selectedPage.id ? updatedPage : p));
  };

  const renderComponentPreview = (component: PageComponent) => {
    
    switch (component.type) {
      case 'header':
        return (
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold">{component.content.title}</h1>
            <p className="text-gray-600 mt-2">{component.content.subtitle}</p>
          </div>
        );
      case 'navigation':
        return (
          <nav className="flex justify-center space-x-8 py-4 border-b">
            {component.content.menuItems.map((item: any, index: number) => (
              <a key={index} href={item.href} className="text-gray-700 hover:text-gray-900">
                {item.label}
              </a>
            ))}
          </nav>
        );
      case 'hero':
        return (
          <div className="text-center py-16 bg-gradient-to-r from-purple-400 to-blue-500 text-white">
            <h2 className="text-4xl font-bold mb-4">{component.content.title}</h2>
            <p className="text-xl mb-8">{component.content.description}</p>
            <button className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium">
              {component.content.ctaText}
            </button>
          </div>
        );
      case 'text':
        return (
          <div className="py-8">
            <p className="text-gray-700">{component.content.text}</p>
          </div>
        );
      case 'image':
        return (
          <div className="py-8 text-center">
            <img src={component.content.src} alt={component.content.alt} className="mx-auto rounded-lg" />
            <p className="text-sm text-gray-500 mt-2">{component.content.caption}</p>
          </div>
        );
      case 'button':
        return (
          <div className="py-8 text-center">
            <button className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
              {component.content.text}
            </button>
          </div>
        );
      case 'card':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-2">{component.content.title}</h3>
            <p className="text-gray-600 mb-4">{component.content.description}</p>
            <button className="text-blue-500 hover:text-blue-600">
              {component.content.actions[0]?.text}
            </button>
          </div>
        );
      case 'footer':
        return (
          <div className="bg-gray-800 text-white py-8 text-center">
            <p>{component.content.copyright}</p>
            <div className="mt-4 space-x-4">
              {component.content.links.map((link: any, index: number) => (
                <a key={index} href={link.href} className="text-gray-400 hover:text-white">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 border rounded">
            <p className="text-gray-500">{component.type} component</p>
          </div>
        );
    }
  };

  if (!hasPermission('metadata:read')) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">
              You don't have permission to access pages.
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
          <h1 className="text-3xl font-bold text-gray-900">Page Builder</h1>
          <p className="mt-2 text-gray-600">
            Create custom pages and navigation for your application.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={createNewPage}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Page
          </button>
        </div>
      </div>

      {!selectedPage ? (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Pages</h3>
            {pages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No pages found. Create your first page to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.isArray(pages) && pages.map((page) => (
                  <div
                    key={page.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedPage(page)}
                  >
                    <h4 className="font-medium text-gray-900">{page.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">/{page.slug}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {page.components.length} components
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        page.settings.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {page.settings.isPublished ? 'Published' : 'Draft'}
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
                  onClick={() => setSelectedPage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ← Back
                </button>
                <div>
                  <input
                    type="text"
                    value={selectedPage.name}
                    onChange={(e) => setSelectedPage({...selectedPage, name: e.target.value})}
                    className="text-lg font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                  <input
                    type="text"
                    value={selectedPage.slug}
                    onChange={(e) => setSelectedPage({...selectedPage, slug: e.target.value})}
                    className="text-sm text-gray-500 bg-transparent border-none focus:outline-none focus:ring-0 mt-1"
                    placeholder="page-slug"
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
                    onClick={() => setActiveTab('code')}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      activeTab === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <Code className="w-4 h-4 inline mr-1" />
                    Code
                  </button>
                </div>
                <button
                  onClick={publishPage}
                  className="inline-flex items-center px-3 py-2 border border-green-600 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50"
                >
                  Publish
                </button>
                <button
                  onClick={savePage}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
              </div>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex">
              <div className="w-80 border-r border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Components</h3>
                <div className="space-y-4">
                  {Object.entries(componentCategories).map(([categoryKey, category]) => {
                    const Icon = category.icon;
                    const isExpanded = expandedCategory === categoryKey;
                    
                    return (
                      <div key={categoryKey}>
                        <button
                          onClick={() => setExpandedCategory(isExpanded ? '' : categoryKey)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
                        >
                          <div className="flex items-center">
                            <Icon className="w-4 h-4 mr-2" />
                            {category.name}
                          </div>
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <Droppable droppableId="components" isDropDisabled={true}>
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="mt-2 space-y-2 pl-6"
                              >
                                {category.components.map((componentType, index) => {
                                  const componentDef = componentDefinitions[componentType as keyof typeof componentDefinitions];
                                  const Icon = componentDef.icon;
                                  return (
                                    <Draggable key={componentType} draggableId={componentType} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`p-3 rounded-lg border-2 cursor-move transition-all ${
                                            componentDef.bgColor
                                          } ${componentDef.borderColor} ${
                                            snapshot.isDragging ? 'shadow-lg opacity-75' : ''
                                          }`}
                                        >
                                          <div className={`w-6 h-6 ${componentDef.color} rounded-md flex items-center justify-center mx-auto mb-2`}>
                                            <Icon className="w-4 h-4 text-white" />
                                          </div>
                                          <div className="text-xs font-medium text-gray-900 text-center">
                                            {String(componentType).charAt(0).toUpperCase() + String(componentType).slice(1)}
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
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedComponent && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Component Properties</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={selectedComponent.name}
                          onChange={(e) => updateComponent(selectedComponent.id, { name: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                        <div className="px-2 py-1 text-sm bg-gray-100 rounded">
                          {selectedComponent.type}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteComponent(selectedComponent.id)}
                        className="w-full flex items-center px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Component
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1">
                {activeTab === 'design' && (
                  <div className="p-4">
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg min-h-96">
                      <Droppable droppableId="canvas">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="p-4 min-h-96"
                          >
                            {Array.isArray(selectedPage.components) && selectedPage.components.length === 0 ? (
                              <div className="text-center py-12">
                                <p className="text-gray-500">Drag components here to start building your page</p>
                              </div>
                            ) : (
                              Array.isArray(selectedPage.components) && selectedPage.components.map((component, index) => {
                                const componentDef = componentDefinitions[component.type];
                                const isSelected = selectedComponent?.id === component.id;

                                return (
                                  <Draggable key={component.id} draggableId={component.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`mb-4 rounded-lg border-2 cursor-move transition-all ${
                                          componentDef.bgColor
                                        } ${componentDef.borderColor} ${
                                          isSelected ? 'ring-2 ring-indigo-500' : ''
                                        } ${snapshot.isDragging ? 'shadow-lg opacity-75' : ''}`}
                                        onClick={() => setSelectedComponent(component)}
                                      >
                                        <div className="p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-900">
                                              {component.name}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {component.type}
                                            </span>
                                          </div>
                                          {renderComponentPreview(component)}
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="p-4">
                    <div className="bg-white border rounded-lg min-h-96">
                      <div className="p-4">
                        {Array.isArray(selectedPage.components) && selectedPage.components.map((component) => (
                          <div key={component.id}>
                            {renderComponentPreview(component)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="p-4">
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
                      <pre>{JSON.stringify(selectedPage, null, 2)}</pre>
                    </div>
                  </div>
                )}

                <div className="p-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Page Settings</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Theme</label>
                      <select
                        value={selectedPage.settings.theme}
                        onChange={(e) => setSelectedPage({
                          ...selectedPage,
                          settings: {
                            ...selectedPage.settings,
                            theme: e.target.value as 'light' | 'dark' | 'custom'
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Layout</label>
                      <select
                        value={selectedPage.settings.layout}
                        onChange={(e) => setSelectedPage({
                          ...selectedPage,
                          settings: {
                            ...selectedPage.settings,
                            layout: e.target.value as 'default' | 'centered' | 'full-width'
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="default">Default</option>
                        <option value="centered">Centered</option>
                        <option value="full-width">Full Width</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPage.settings.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPage.settings.isPublished ? 'Published' : 'Draft'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DragDropContext>
        </div>
      )}
    </div>
  );
};
