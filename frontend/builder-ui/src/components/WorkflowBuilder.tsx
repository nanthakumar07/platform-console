import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Play, Save, ArrowRight, Clock, Database, Mail, AlertCircle } from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'notification';
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceOutput?: string;
  targetInput?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings: {
    isActive: boolean;
    errorHandling: 'stop' | 'continue' | 'retry';
    retryCount: number;
  };
}

const nodeTypes = {
  trigger: {
    icon: Clock,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    configFields: ['eventType', 'conditions']
  },
  action: {
    icon: Database,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    configFields: ['actionType', 'targetObject', 'operation']
  },
  condition: {
    icon: AlertCircle,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    configFields: ['conditions', 'truePath', 'falsePath']
  },
  delay: {
    icon: Clock,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    configFields: ['duration', 'unit']
  },
  notification: {
    icon: Mail,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    configFields: ['recipients', 'subject', 'template']
  }
};

export const WorkflowBuilder: React.FC = () => {
  const { hasPermission } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [, setIsEditing] = useState(false);

  const createNewWorkflow = () => {
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: 'New Workflow',
      description: 'Describe your workflow here',
      nodes: [],
      connections: [],
      settings: {
        isActive: false,
        errorHandling: 'stop',
        retryCount: 3
      }
    };
    setWorkflows([...workflows, newWorkflow]);
    setSelectedWorkflow(newWorkflow);
    setIsEditing(true);
  };

  const addNode = (type: WorkflowNode['type']) => {
    if (!selectedWorkflow) return;

    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      position: { x: 100, y: 100 },
      config: {},
      inputs: type === 'trigger' ? [] : ['input'],
      outputs: type === 'condition' ? ['true', 'false'] : ['output']
    };

    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: [...selectedWorkflow.nodes, newNode]
    };

    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === selectedWorkflow.id ? updatedWorkflow : w));
  };

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    if (!selectedWorkflow) return;

    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: Array.isArray(selectedWorkflow.nodes) ? selectedWorkflow.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      ) : []
    };

    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === selectedWorkflow.id ? updatedWorkflow : w));
  };

  const deleteNode = (nodeId: string) => {
    if (!selectedWorkflow) return;

    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: selectedWorkflow.nodes.filter(node => node.id !== nodeId),
      connections: selectedWorkflow.connections.filter(
        conn => conn.source !== nodeId && conn.target !== nodeId
      )
    };

    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === selectedWorkflow.id ? updatedWorkflow : w));
    setSelectedNode(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: WorkflowNode) => {
    e.preventDefault();
    setSelectedNode(node);
    setDraggedNode(node);
    setIsDragging(true);
    setDragStart({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedNode || !selectedWorkflow) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    updateNode(draggedNode.id, {
      position: {
        x: Math.max(0, newX),
        y: Math.max(0, newY)
      }
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const saveWorkflow = () => {
    if (!selectedWorkflow) return;
    
    console.log('Saving workflow:', selectedWorkflow);
    setIsEditing(false);
  };

  const testWorkflow = () => {
    if (!selectedWorkflow) return;
    
    console.log('Testing workflow:', selectedWorkflow);
  };

  if (!hasPermission('workflows:read')) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">
              You don't have permission to access workflows.
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
          <h1 className="text-3xl font-bold text-gray-900">Workflow Builder</h1>
          <p className="mt-2 text-gray-600">
            Create and manage automated workflows for your business processes.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={createNewWorkflow}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </button>
        </div>
      </div>

      {!selectedWorkflow ? (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Workflows</h3>
            {workflows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No workflows found. Create your first workflow to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.isArray(workflows) && workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        workflow.settings.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.settings.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {workflow.nodes.length} nodes
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
                  onClick={() => setSelectedWorkflow(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ← Back
                </button>
                <div>
                  <input
                    type="text"
                    value={selectedWorkflow.name}
                    onChange={(e) => setSelectedWorkflow({...selectedWorkflow, name: e.target.value})}
                    className="text-lg font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                  <input
                    type="text"
                    value={selectedWorkflow.description}
                    onChange={(e) => setSelectedWorkflow({...selectedWorkflow, description: e.target.value})}
                    className="text-sm text-gray-500 bg-transparent border-none focus:outline-none focus:ring-0 mt-1"
                    placeholder="Add description..."
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={testWorkflow}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Test
                </button>
                <button
                  onClick={saveWorkflow}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
              </div>
            </div>
          </div>

          <div className="flex">
            <div className="w-48 border-r border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Components</h3>
              <div className="space-y-2">
                {Object.entries(nodeTypes).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => addNode(type as WorkflowNode['type'])}
                      className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-white ${config.color} hover:opacity-90`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  );
                })}
              </div>

              {selectedNode && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Node Properties</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={selectedNode.name}
                        onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <div className="px-2 py-1 text-sm bg-gray-100 rounded">
                        {selectedNode.type}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteNode(selectedNode.id)}
                      className="w-full flex items-center px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Node
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div
                className="relative h-96 bg-gray-50 border-b border-gray-200 overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {selectedWorkflow.connections.map((conn) => {
                    const sourceNode = selectedWorkflow.nodes.find(n => n.id === conn.source);
                    const targetNode = selectedWorkflow.nodes.find(n => n.id === conn.target);
                    if (!sourceNode || !targetNode) return null;

                    return (
                      <g key={conn.id}>
                        <line
                          x1={sourceNode.position.x + 100}
                          y1={sourceNode.position.y + 40}
                          x2={targetNode.position.x}
                          y2={targetNode.position.y + 40}
                          stroke="#6B7280"
                          strokeWidth="2"
                          className="pointer-events-auto cursor-pointer hover:stroke-red-500"
                          onClick={() => {
                            const updatedWorkflow = {
                              ...selectedWorkflow,
                              connections: selectedWorkflow.connections.filter(c => c.id !== conn.id)
                            };
                            setSelectedWorkflow(updatedWorkflow);
                            setWorkflows(workflows.map(w => w.id === selectedWorkflow.id ? updatedWorkflow : w));
                          }}
                        />
                        <ArrowRight
                          x={targetNode.position.x - 8}
                          y={targetNode.position.y + 32}
                          size={16}
                          fill="#6B7280"
                        />
                      </g>
                    );
                  })}
                </svg>

                {Array.isArray(selectedWorkflow.nodes) && selectedWorkflow.nodes.map((node) => {
                  const nodeType = nodeTypes[node.type];
                  const Icon = nodeType.icon;
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <div
                      key={node.id}
                      className={`absolute w-24 p-3 rounded-lg border-2 cursor-move transition-all select-none ${
                        nodeType.bgColor
                      } ${nodeType.borderColor} ${
                        isSelected ? 'ring-2 ring-indigo-500 shadow-lg' : ''
                      } ${isDragging && draggedNode?.id === node.id ? 'opacity-75 scale-95' : 'hover:scale-105 hover:shadow-md'}`}
                      style={{
                        left: `${node.position.x}px`,
                        top: `${node.position.y}px`,
                        touchAction: 'none',
                        userSelect: 'none'
                      }}
                      onMouseDown={(e) => handleNodeMouseDown(e, node)}
                      onClick={() => setSelectedNode(node)}
                    >
                      <div className={`w-6 h-6 ${nodeType.color} rounded-md flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-xs font-medium text-gray-900 text-center truncate">
                        {node.name}
                      </div>
                      <div className="flex justify-between mt-2">
                        {node.inputs.length > 0 && (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        )}
                        {node.outputs.length > 0 && (
                          <div className="w-2 h-2 bg-gray-400 rounded-full ml-auto" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Workflow Settings</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={selectedWorkflow.settings.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setSelectedWorkflow({
                        ...selectedWorkflow,
                        settings: {
                          ...selectedWorkflow.settings,
                          isActive: e.target.value === 'active'
                        }
                      })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="inactive">Inactive</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Error Handling</label>
                    <select
                      value={selectedWorkflow.settings.errorHandling}
                      onChange={(e) => setSelectedWorkflow({
                        ...selectedWorkflow,
                        settings: {
                          ...selectedWorkflow.settings,
                          errorHandling: e.target.value as 'stop' | 'continue' | 'retry'
                        }
                      })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="stop">Stop</option>
                      <option value="continue">Continue</option>
                      <option value="retry">Retry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Retry Count</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={selectedWorkflow.settings.retryCount}
                      onChange={(e) => setSelectedWorkflow({
                        ...selectedWorkflow,
                        settings: {
                          ...selectedWorkflow.settings,
                          retryCount: parseInt(e.target.value) || 0
                        }
                      })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
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
