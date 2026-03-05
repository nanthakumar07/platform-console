import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone, Maximize2 } from 'lucide-react';
import { Layout, LayoutComponent } from '../services/layoutService';

interface ResponsivePreviewProps {
  layout: Layout;
  onDeviceChange?: (device: 'mobile' | 'tablet' | 'desktop') => void;
}

interface DeviceFrame {
  type: 'mobile' | 'tablet' | 'desktop';
  name: string;
  icon: React.ElementType;
  width: number;
  height: number;
  scale: number;
  maxWidth: string;
}

const deviceFrames: DeviceFrame[] = [
  {
    type: 'mobile',
    name: 'Mobile',
    icon: Smartphone,
    width: 375,
    height: 667,
    scale: 0.8,
    maxWidth: '100%'
  },
  {
    type: 'tablet',
    name: 'Tablet',
    icon: Tablet,
    width: 768,
    height: 1024,
    scale: 0.6,
    maxWidth: '768px'
  },
  {
    type: 'desktop',
    name: 'Desktop',
    icon: Monitor,
    width: 1280,
    height: 800,
    scale: 0.4,
    maxWidth: '1200px'
  }
];

const componentStyles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    fontWeight: 'bold',
    fontSize: '0.875rem'
  },
  sidebar: {
    backgroundColor: '#6b7280',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    fontSize: '0.75rem'
  },
  content: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    fontSize: '0.875rem'
  },
  footer: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    fontSize: '0.75rem'
  },
  card: {
    backgroundColor: '#6366f1',
    color: 'white',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    fontSize: '0.75rem'
  },
  form: {
    backgroundColor: '#eab308',
    color: 'white',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    fontSize: '0.75rem'
  },
  table: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    fontSize: '0.75rem'
  },
  chart: {
    backgroundColor: '#f97316',
    color: 'white',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    fontSize: '0.75rem'
  }
};

export const ResponsivePreview: React.FC<ResponsivePreviewProps> = ({ layout, onDeviceChange }) => {
  const [selectedDevice, setSelectedDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentFrame = deviceFrames.find(frame => frame.type === selectedDevice)!;

  const handleDeviceChange = (device: 'mobile' | 'tablet' | 'desktop') => {
    setSelectedDevice(device);
    onDeviceChange?.(device);
  };

  const getResponsiveLayout = () => {
    if (!layout.settings.isResponsive) {
      return layout.components;
    }

    // Simple responsive logic - in real implementation, this would be more sophisticated
    return layout.components.map(component => {
      if (selectedDevice === 'mobile') {
        if (component.type === 'sidebar') {
          return { ...component, width: Math.min(component.width, 4) };
        }
        if (component.type === 'header' || component.type === 'footer') {
          return { ...component, width: 12 };
        }
        return { ...component, width: Math.min(component.width, 8) };
      } else if (selectedDevice === 'tablet') {
        if (component.type === 'sidebar') {
          return { ...component, width: Math.min(component.width, 3) };
        }
        return component;
      }
      return component;
    });
  };

  const renderComponent = (component: LayoutComponent) => {
    const style = componentStyles[component.type] || componentStyles.content;
    
    return (
      <div
        key={component.id}
        style={{
          ...style,
          gridColumn: `span ${component.width}`,
          gridRow: `span ${component.height}`,
          minHeight: `${component.height * 40}px`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={component.name}
      >
        <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
          {component.name}
        </div>
      </div>
    );
  };

  const previewContent = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.gridSettings.columns}, 1fr)`,
        gap: `${layout.gridSettings.margin[0]}px`,
        padding: `${layout.gridSettings.containerPadding[0]}px`,
        backgroundColor: '#f9fafb',
        minHeight: '400px',
        borderRadius: '0.5rem',
        fontSize: '0.75rem'
      }}
    >
      {getResponsiveLayout().map(renderComponent)}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="relative bg-white rounded-lg shadow-2xl">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute -top-12 right-0 text-white hover:text-gray-300"
          >
            <Maximize2 className="w-6 h-6" />
          </button>
          <div className="p-8">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Desktop Preview</h3>
              <p className="text-sm text-gray-600">Full screen layout preview</p>
            </div>
            {previewContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Device Selector */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Responsive Preview</h3>
          <div className="flex items-center space-x-2">
            {deviceFrames.map((frame) => {
              const Icon = frame.icon;
              return (
                <button
                  key={frame.type}
                  onClick={() => handleDeviceChange(frame.type)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedDevice === frame.type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={`${frame.name} (${frame.width}×${frame.height})`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {frame.name}
                </button>
              );
            })}
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="Fullscreen Preview"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="p-6 bg-gray-50">
        <div className="flex justify-center">
          <div
            className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-300"
            style={{
              width: `${currentFrame.width * currentFrame.scale}px`,
              height: `${currentFrame.height * currentFrame.scale}px`,
              maxWidth: currentFrame.maxWidth,
              transform: `scale(${currentFrame.scale})`,
              transformOrigin: 'top center',
              transition: 'all 0.3s ease-in-out'
            }}
          >
            {/* Device Status Bar */}
            <div className="bg-gray-900 text-white text-xs px-2 py-1 flex justify-between items-center">
              <span>{new Date().toLocaleTimeString()}</span>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-3 bg-white rounded-sm"></div>
                <div className="w-1 h-3 bg-white rounded-sm"></div>
                <div className="w-4 h-3 bg-white rounded-sm"></div>
              </div>
            </div>

            {/* Preview Content */}
            <div className="overflow-auto" style={{ height: `${currentFrame.height * currentFrame.scale - 32}px` }}>
              {previewContent}
            </div>

            {/* Device Browser Bar */}
            <div className="bg-gray-100 border-t border-gray-300 px-2 py-1 flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
              <div className="flex-1 text-xs text-gray-600 truncate">
                {window.location.origin}/preview/{layout.name.toLowerCase().replace(/\s+/g, '-')}
              </div>
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center text-sm text-gray-600">
            <span className="font-medium">{currentFrame.name}</span>
            <span className="mx-2">•</span>
            <span>{currentFrame.width} × {currentFrame.height}px</span>
            {layout.settings.isResponsive && (
              <>
                <span className="mx-2">•</span>
                <span className="text-green-600 font-medium">Responsive</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
