import React, { useState, useEffect } from 'react';
import { LayoutComponent } from '../services/layoutService';
import { X, Plus, Trash2 } from 'lucide-react';

interface ComponentConfigPanelProps {
  component: LayoutComponent | null;
  onUpdate: (componentId: string, updates: Partial<LayoutComponent>) => void;
  onDelete: (componentId: string) => void;
  onClose: () => void;
}

interface ConfigField {
  key: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'array' | 'object';
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  validation?: (value: any) => boolean;
  helpText?: string;
}

const componentConfigFields: Record<string, ConfigField[]> = {
  header: [
    { key: 'title', type: 'text', label: 'Title', placeholder: 'Enter header title' },
    { key: 'subtitle', type: 'text', label: 'Subtitle', placeholder: 'Enter subtitle' },
    { key: 'navigation', type: 'array', label: 'Navigation Items', helpText: 'Add navigation menu items' },
    { key: 'showUser', type: 'boolean', label: 'Show User Info' },
    { key: 'sticky', type: 'boolean', label: 'Sticky Header' }
  ],
  sidebar: [
    { key: 'menuItems', type: 'array', label: 'Menu Items', helpText: 'Configure sidebar menu' },
    { key: 'collapsible', type: 'boolean', label: 'Collapsible' },
    { key: 'defaultExpanded', type: 'boolean', label: 'Expanded by Default' },
    { key: 'width', type: 'number', label: 'Width (px)', min: 200, max: 400, step: 10 },
    { key: 'position', type: 'select', label: 'Position', options: [
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' }
    ]}
  ],
  content: [
    { key: 'contentType', type: 'select', label: 'Content Type', options: [
      { value: 'dashboard', label: 'Dashboard' },
      { value: 'form', label: 'Form' },
      { value: 'table', label: 'Table' },
      { value: 'chart', label: 'Chart' },
      { value: 'custom', label: 'Custom' }
    ]},
    { key: 'dataSource', type: 'text', label: 'Data Source', placeholder: 'API endpoint or data source' },
    { key: 'refreshInterval', type: 'number', label: 'Refresh Interval (seconds)', min: 5, max: 300, step: 5 },
    { key: 'loading', type: 'boolean', label: 'Show Loading State' }
  ],
  footer: [
    { key: 'links', type: 'array', label: 'Footer Links', helpText: 'Add footer navigation links' },
    { key: 'copyright', type: 'text', label: 'Copyright Text', placeholder: '© 2024 Your Company' },
    { key: 'showSocial', type: 'boolean', label: 'Show Social Links' },
    { key: 'socialLinks', type: 'object', label: 'Social Media Links' }
  ],
  card: [
    { key: 'title', type: 'text', label: 'Card Title', placeholder: 'Enter card title' },
    { key: 'content', type: 'text', label: 'Content', placeholder: 'Card content or HTML' },
    { key: 'actions', type: 'array', label: 'Actions', helpText: 'Add action buttons' },
    { key: 'variant', type: 'select', label: 'Variant', options: [
      { value: 'default', label: 'Default' },
      { value: 'outlined', label: 'Outlined' },
      { value: 'elevated', label: 'Elevated' }
    ]},
    { key: 'padding', type: 'number', label: 'Padding (px)', min: 0, max: 50, step: 5 }
  ],
  form: [
    { key: 'formId', type: 'text', label: 'Form ID', placeholder: 'unique-form-id' },
    { key: 'fields', type: 'array', label: 'Form Fields', helpText: 'Configure form fields' },
    { key: 'validation', type: 'boolean', label: 'Enable Validation' },
    { key: 'submitText', type: 'text', label: 'Submit Button Text', placeholder: 'Submit' },
    { key: 'resetText', type: 'text', label: 'Reset Button Text', placeholder: 'Reset' },
    { key: 'layout', type: 'select', label: 'Field Layout', options: [
      { value: 'vertical', label: 'Vertical' },
      { value: 'horizontal', label: 'Horizontal' },
      { value: 'grid', label: 'Grid' }
    ]}
  ],
  table: [
    { key: 'dataSource', type: 'text', label: 'Data Source', placeholder: 'API endpoint' },
    { key: 'columns', type: 'array', label: 'Table Columns', helpText: 'Configure table columns' },
    { key: 'pagination', type: 'boolean', label: 'Enable Pagination' },
    { key: 'pageSize', type: 'number', label: 'Page Size', min: 5, max: 100, step: 5 },
    { key: 'sortable', type: 'boolean', label: 'Sortable Columns' },
    { key: 'filterable', type: 'boolean', label: 'Filterable' },
    { key: 'searchable', type: 'boolean', label: 'Searchable' }
  ],
  chart: [
    { key: 'chartType', type: 'select', label: 'Chart Type', options: [
      { value: 'line', label: 'Line Chart' },
      { value: 'bar', label: 'Bar Chart' },
      { value: 'pie', label: 'Pie Chart' },
      { value: 'area', label: 'Area Chart' },
      { value: 'scatter', label: 'Scatter Plot' }
    ]},
    { key: 'dataSource', type: 'text', label: 'Data Source', placeholder: 'API endpoint' },
    { key: 'xAxis', type: 'text', label: 'X-Axis Field', placeholder: 'Field name for X axis' },
    { key: 'yAxis', type: 'text', label: 'Y-Axis Field', placeholder: 'Field name for Y axis' },
    { key: 'refreshInterval', type: 'number', label: 'Refresh Interval (seconds)', min: 10, max: 300, step: 10 },
    { key: 'showLegend', type: 'boolean', label: 'Show Legend' },
    { key: 'showTooltip', type: 'boolean', label: 'Show Tooltips' }
  ]
};

const ArrayEditor: React.FC<{
  value: any[];
  onChange: (value: any[]) => void;
  field: ConfigField;
}> = ({ value, onChange, field }) => {
  const [items, setItems] = useState<any[]>(value || []);

  const addItem = () => {
    const newItem = field.key === 'links' ? { text: '', url: '' } : 
                     field.key === 'menuItems' ? { label: '', url: '', icon: '' } :
                     field.key === 'fields' ? { name: '', type: 'text', required: false } :
                     field.key === 'actions' ? { text: '', action: '', variant: 'primary' } :
                     field.key === 'columns' ? { key: '', label: '', type: 'text', sortable: true } :
                     '';
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, updates: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange(newItems);
  };

  useEffect(() => {
    onChange(items);
  }, [items]);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2 p-2 border border-gray-200 rounded">
          <input
            type="text"
            value={typeof item === 'object' ? item.text || item.label || item.name : item}
            onChange={(e) => updateItem(index, { text: e.target.value })}
            placeholder={field.placeholder}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <button
            onClick={() => removeItem(index)}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="w-full flex items-center justify-center px-2 py-1 text-sm text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add {field.label.replace(/s$/, '')}
      </button>
    </div>
  );
};

const ObjectEditor: React.FC<{
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}> = ({ value, onChange }) => {
  const [object, setObject] = useState<Record<string, any>>(value || {});

  const updateProperty = (key: string, propValue: any) => {
    const newObject = { ...object, [key]: propValue };
    setObject(newObject);
    onChange(newObject);
  };

  useEffect(() => {
    onChange(object);
  }, [object]);

  return (
    <div className="space-y-2">
      {Object.entries(object).map(([key, val]) => (
        <div key={key} className="flex items-center space-x-2 p-2 border border-gray-200 rounded">
          <input
            type="text"
            value={key}
            onChange={(e) => {
              const newObject = { ...object };
              newObject[e.target.value] = val;
              setObject(newObject);
            }}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <input
            type="text"
            value={val}
            onChange={(e) => updateProperty(key, e.target.value)}
            placeholder="Value"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <button
            onClick={() => {
              const newObject = { ...object };
              delete newObject[key];
              setObject(newObject);
            }}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => updateProperty(`prop_${Date.now()}`, '')}
        className="w-full flex items-center justify-center px-2 py-1 text-sm text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Property
      </button>
    </div>
  );
};

const FieldRenderer: React.FC<{
  field: ConfigField;
  value: any;
  onChange: (value: any) => void;
}> = ({ field, value, onChange }) => {
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      );
    
    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(field.min ? Math.max(field.min, parseInt(e.target.value) || 0) : parseInt(e.target.value) || 0)}
          min={field.min}
          max={field.max}
          step={field.step}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      );
    
    case 'boolean':
      return (
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">{field.label}</span>
        </label>
      );
    
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select {field.label}</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    
    case 'array':
      return <ArrayEditor value={value || []} onChange={onChange} field={field} />;
    
    case 'object':
      return <ObjectEditor value={value || {}} onChange={onChange} />;
    
    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      );
  }
};

export const ComponentConfigPanel: React.FC<ComponentConfigPanelProps> = ({
  component,
  onUpdate,
  onDelete,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'style' | 'advanced'>('properties');

  if (!component) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 h-full">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Component Configuration</h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 text-center text-gray-500">
          Select a component to configure
        </div>
      </div>
    );
  }

  const configFields = componentConfigFields[component.type] || [];
  const updateConfig = (key: string, value: any) => {
    onUpdate(component.id, {
      config: {
        ...component.config,
        [key]: value
      }
    });
  };

  const updateBasicProperty = (key: string, value: any) => {
    onUpdate(component.id, { [key]: value });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">
            {component.name} Configuration
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1">
          {[
            { key: 'properties', label: 'Properties' },
            { key: 'style', label: 'Style' },
            { key: 'advanced', label: 'Advanced' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                activeTab === tab.key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'properties' && (
          <div className="p-4 space-y-4">
            {/* Basic Properties */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Properties</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={component.name}
                    onChange={(e) => updateBasicProperty('name', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={component.width}
                      onChange={(e) => updateBasicProperty('width', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={component.height}
                      onChange={(e) => updateBasicProperty('height', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Fields */}
            {configFields.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Component Settings</h4>
                <div className="space-y-3">
                  {configFields.map(field => (
                    <div key={field.key}>
                      {field.helpText && (
                        <p className="text-xs text-gray-500 mb-1">{field.helpText}</p>
                      )}
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <FieldRenderer
                        field={field}
                        value={component.config[field.key]}
                        onChange={(value) => updateConfig(field.key, value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'style' && (
          <div className="p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Style Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Background Color</label>
                <input
                  type="color"
                  value={component.config.backgroundColor || '#3b82f6'}
                  onChange={(e) => updateConfig('backgroundColor', e.target.value)}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Text Color</label>
                <input
                  type="color"
                  value={component.config.textColor || '#ffffff'}
                  onChange={(e) => updateConfig('textColor', e.target.value)}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Border Radius (px)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={component.config.borderRadius || 8}
                  onChange={(e) => updateConfig('borderRadius', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Padding (px)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={component.config.padding || 16}
                  onChange={(e) => updateConfig('padding', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Advanced Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CSS Classes</label>
                <textarea
                  value={component.config.cssClasses || ''}
                  onChange={(e) => updateConfig('cssClasses', e.target.value)}
                  placeholder="custom-class-1 another-class"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Custom CSS</label>
                <textarea
                  value={component.config.customCss || ''}
                  onChange={(e) => updateConfig('customCss', e.target.value)}
                  placeholder=".custom-component { color: red; }"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-mono text-xs"
                  rows={6}
                />
              </div>
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={component.config.hidden || false}
                    onChange={(e) => updateConfig('hidden', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-gray-700">Hide Component</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => onDelete(component.id)}
          className="w-full flex items-center justify-center px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Component
        </button>
      </div>
    </div>
  );
};
