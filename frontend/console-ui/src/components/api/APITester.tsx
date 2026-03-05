import React, { useState } from 'react'
import { Send, Copy, Check } from 'lucide-react'

interface APITest {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  headers: Record<string, string>
  body: string
  response: any
  status: number
  duration: number
  timestamp: Date
}

export const APITester: React.FC = () => {
  const [tests, setTests] = useState<APITest[]>([])
  const [currentTest, setCurrentTest] = useState<Partial<APITest>>({
    method: 'GET',
    url: '',
    headers: {},
    body: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const methods: APITest['method'][] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  
  const sampleEndpoints = [
    { method: 'GET', url: '/api/auth/me', description: 'Get current user' },
    { method: 'GET', url: '/api/users', description: 'List all users' },
    { method: 'POST', url: '/api/users', description: 'Create user' },
    { method: 'GET', url: '/api/workflows', description: 'List workflows' },
    { method: 'POST', url: '/api/workflows', description: 'Create workflow' }
  ]

  const executeTest = async () => {
    if (!currentTest.url) return

    setIsLoading(true)
    const startTime = Date.now()

    try {
      const response = await fetch(currentTest.url, {
        method: currentTest.method,
        headers: {
          'Content-Type': 'application/json',
          ...currentTest.headers
        },
        body: ['POST', 'PUT', 'PATCH'].includes(currentTest.method!) ? currentTest.body : undefined
      })

      const duration = Date.now() - startTime
      const responseText = await response.text()

      const newTest: APITest = {
        id: Date.now().toString(),
        method: currentTest.method!,
        url: currentTest.url,
        headers: currentTest.headers || {},
        body: currentTest.body || '',
        response: responseText,
        status: response.status,
        duration,
        timestamp: new Date()
      }

      setTests(prev => [newTest, ...prev.slice(0, 9)]) // Keep last 10 tests
    } catch (error) {
      const duration = Date.now() - startTime
      const newTest: APITest = {
        id: Date.now().toString(),
        method: currentTest.method!,
        url: currentTest.url,
        headers: currentTest.headers || {},
        body: currentTest.body || '',
        response: (error as Error).message,
        status: 0,
        duration,
        timestamp: new Date()
      }

      setTests(prev => [newTest, ...prev.slice(0, 9)])
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addHeader = () => {
    setCurrentTest(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        '': ''
      }
    }))
  }

  const updateHeader = (key: string, value: string) => {
    setCurrentTest(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        [key]: value
      }
    }))
  }

  const removeHeader = (key: string) => {
    const newHeaders = { ...currentTest.headers }
    delete newHeaders[key]
    setCurrentTest(prev => ({
      ...prev,
      headers: newHeaders
    }))
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600'
    if (status >= 300 && status < 400) return 'text-yellow-600'
    if (status >= 400 && status < 500) return 'text-orange-600'
    if (status >= 500) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Tester</h1>
        <p className="text-gray-600">Test your API endpoints with this interactive tool.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Builder */}
        <div className="console-panel">
          <div className="console-header">
            <h2 className="text-lg font-semibold text-gray-900">Request</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Method and URL */}
            <div className="flex space-x-2">
              <select
                value={currentTest.method}
                onChange={(e) => setCurrentTest(prev => ({ ...prev, method: e.target.value as APITest['method'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium"
              >
                {methods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Enter endpoint URL (e.g., /api/users)"
                value={currentTest.url}
                onChange={(e) => setCurrentTest(prev => ({ ...prev, url: e.target.value }))}
                className="console-input flex-1"
              />
            </div>

            {/* Sample Endpoints */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sample Endpoints</label>
              <div className="space-y-1">
                {sampleEndpoints.map((endpoint, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTest(prev => ({
                      ...prev,
                      method: endpoint.method as APITest['method'],
                      url: endpoint.url
                    }))}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                  >
                    <span className="font-medium">{endpoint.method}</span> {endpoint.url} - {endpoint.description}
                  </button>
                ))}
              </div>
            </div>

            {/* Headers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Headers</label>
                <button
                  onClick={addHeader}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  + Add Header
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(currentTest.headers || {}).map(([key, value]) => (
                  <div key={key} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Header name"
                      value={key}
                      onChange={(e) => {
                        const newHeaders = { ...currentTest.headers }
                        delete newHeaders[key]
                        newHeaders[e.target.value] = value
                        setCurrentTest(prev => ({ ...prev, headers: newHeaders }))
                      }}
                      className="console-input flex-1"
                    />
                    <input
                      type="text"
                      placeholder="Header value"
                      value={value}
                      onChange={(e) => updateHeader(key, e.target.value)}
                      className="console-input flex-1"
                    />
                    <button
                      onClick={() => removeHeader(key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            {['POST', 'PUT', 'PATCH'].includes(currentTest.method || '') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request Body</label>
                <textarea
                  placeholder='{"key": "value"}'
                  value={currentTest.body}
                  onChange={(e) => setCurrentTest(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                />
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={executeTest}
              disabled={isLoading || !currentTest.url}
              className="console-button-primary w-full py-3"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Response and History */}
        <div className="space-y-6">
          {/* Latest Response */}
          {tests.length > 0 && (
            <div className="console-panel">
              <div className="console-header">
                <h2 className="text-lg font-semibold text-gray-900">Latest Response</h2>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(tests[0].response, null, 2))}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  {copied ? (
                    <><Check className="h-4 w-4 mr-1" /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copy</>
                  )}
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <span className={`font-medium ${getStatusColor(tests[0].status)}`}>
                      {tests[0].status} {tests[0].status >= 200 && tests[0].status < 300 ? 'OK' : ''}
                    </span>
                    <span className="text-sm text-gray-500">
                      {tests[0].duration}ms
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {tests[0].timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(tests[0].response, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Test History */}
          {tests.length > 1 && (
            <div className="console-panel">
              <div className="console-header">
                <h2 className="text-lg font-semibold text-gray-900">Test History</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {tests.slice(1).map((test) => (
                    <div key={test.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{test.method}</span>
                          <span className="text-sm text-gray-600 truncate flex-1">{test.url}</span>
                          <span className={`text-sm font-medium ${getStatusColor(test.status)}`}>
                            {test.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{test.duration}ms</span>
                          <span>{test.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
