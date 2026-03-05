import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Navigation } from './components/Navigation';
import { ProtectedRoute } from './components/ProtectedRoute';
import Statistics from './components/Statistics';
import AdvancedAnalyticsDashboard from './components/AdvancedAnalyticsDashboard';
import CollaborationDashboard from './components/CollaborationDashboard';
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy load components
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const ObjectBuilder = React.lazy(() => import('./components/ObjectBuilder').then(module => ({ default: module.ObjectBuilder })));
const FieldBuilder = React.lazy(() => import('./components/FieldBuilder').then(module => ({ default: module.default })));
const FormBuilder = React.lazy(() => import('./components/FormBuilder').then(module => ({ default: module.default })));
const WorkflowBuilder = React.lazy(() => import('./components/WorkflowBuilder').then(module => ({ default: module.WorkflowBuilder })));
const LayoutBuilder = React.lazy(() => import('./components/LayoutBuilder').then(module => ({ default: module.LayoutBuilder })));
const PageBuilder = React.lazy(() => import('./components/PageBuilder').then(module => ({ default: module.PageBuilder })));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/statistics" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Statistics />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute permissions={['analytics:read']}>
              <AdvancedAnalyticsDashboard />
            </ProtectedRoute>
          } />
          <Route path="/collaboration" element={
            <ProtectedRoute permissions={['collaboration:read']}>
              <CollaborationDashboard />
            </ProtectedRoute>
          } />
          <Route path="/objects" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <ObjectBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/objects/:id" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <ObjectBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/objects/:objectId/fields" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <FieldBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/forms" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <FormBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/forms/:id" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <FormBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/workflows" element={
            <ProtectedRoute permissions={['workflows:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <WorkflowBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/workflows/:id" element={
            <ProtectedRoute permissions={['workflows:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <WorkflowBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/layouts" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <LayoutBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/layouts/:id" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <LayoutBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/pages" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <PageBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/pages/:id" element={
            <ProtectedRoute permissions={['metadata:read']}>
              <Suspense fallback={<LoadingSpinner />}>
                <PageBuilder />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
