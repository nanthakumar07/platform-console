import React, { useState, useEffect } from 'react';
import { layoutService, LayoutTemplate } from '../services/layoutService';
import { Download, Eye, Star, Clock, Zap } from 'lucide-react';

interface LayoutTemplatesProps {
  onSelectTemplate: (template: LayoutTemplate) => void;
  onCreateFromTemplate: (template: LayoutTemplate, layoutName: string) => void;
}

const categoryIcons = {
  dashboard: Zap,
  form: Star,
  report: Clock,
  landing: Eye,
  admin: Download
};

const categoryColors = {
  dashboard: 'bg-blue-100 text-blue-800',
  form: 'bg-green-100 text-green-800',
  report: 'bg-purple-100 text-purple-800',
  landing: 'bg-orange-100 text-orange-800',
  admin: 'bg-red-100 text-red-800'
};

export const LayoutTemplates: React.FC<LayoutTemplatesProps> = ({
  onSelectTemplate,
  onCreateFromTemplate
}) => {
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<LayoutTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const fetchedTemplates = await layoutService.getTemplates();
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'form', label: 'Forms' },
    { value: 'report', label: 'Reports' },
    { value: 'landing', label: 'Landing Pages' },
    { value: 'admin', label: 'Admin Panels' }
  ];

  const handleCreateFromTemplate = async (template: LayoutTemplate) => {
    const layoutName = prompt('Enter a name for your new layout:', `${template.name} Copy`);
    if (layoutName && layoutName.trim()) {
      try {
        await onCreateFromTemplate(template, layoutName.trim());
        // Show success message
        alert(`Layout "${layoutName}" created successfully!`);
      } catch (error) {
        console.error('Failed to create layout from template:', error);
        alert('Failed to create layout. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Layout Templates</h3>
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search templates..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Eye className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                selectedCategory === category.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="p-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map(template => {
              const Icon = categoryIcons[template.category];
              return (
                <div
                  key={template.id}
                  className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  {/* Template Preview */}
                  <div className="aspect-widescreen bg-gray-50 p-4">
                    <div className="h-full bg-white rounded border border-gray-200 flex items-center justify-center">
                      {template.thumbnail ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-gray-400">
                          <Icon className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs">{template.category}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                        {template.name}
                      </h4>
                      {template.isPremium && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1" />
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                    
                    {/* Category Badge */}
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[template.category]}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {template.category}
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(template);
                        }}
                        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
                        title="Use Template"
                      >
                        <Eye className="w-5 h-5 text-indigo-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateFromTemplate(template);
                        }}
                        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
                        title="Create from Template"
                      >
                        <Download className="w-5 h-5 text-green-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex h-full">
              {/* Preview Panel */}
              <div className="w-1/2 p-6 border-r border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Preview</h3>
                <div className="aspect-video bg-gray-50 rounded-lg border border-gray-200 p-4">
                  {selectedTemplate.thumbnail ? (
                    <img
                      src={selectedTemplate.thumbnail}
                      alt={selectedTemplate.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      {(() => {
                        const Icon = categoryIcons[selectedTemplate.category];
                        return <Icon className="h-16 w-16 text-gray-400" />;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Details Panel */}
              <div className="w-1/2 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Template Details</h3>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">{selectedTemplate.name}</h4>
                    <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                  </div>

                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryColors[selectedTemplate.category]}`}>
                    {(() => {
                      const Icon = categoryIcons[selectedTemplate.category];
                      return <Icon className="w-4 h-4 mr-2" />;
                    })()}
                    {selectedTemplate.category}
                    {selectedTemplate.isPremium && (
                      <>
                        <span className="mx-2">•</span>
                        <Star className="w-4 h-4" />
                        Premium
                      </>
                    )}
                  </div>

                  {/* Layout Structure */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Layout Structure</h5>
                    <div className="space-y-2">
                      {selectedTemplate.layout.components.map((component, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                          <span className="font-medium">{component.type}</span>
                          <span className="text-gray-400">
                            ({component.width}×{component.height})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grid Settings */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Grid Settings</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Columns: {selectedTemplate.layout.gridSettings.columns}</div>
                      <div>Row Height: {selectedTemplate.layout.gridSettings.rowHeight}px</div>
                      <div>Margin: {selectedTemplate.layout.gridSettings.margin.join('px, ')}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          onSelectTemplate(selectedTemplate);
                          setSelectedTemplate(null);
                        }}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Use Template
                      </button>
                      <button
                        onClick={() => {
                          handleCreateFromTemplate(selectedTemplate);
                          setSelectedTemplate(null);
                        }}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Create Layout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
