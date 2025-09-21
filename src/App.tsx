import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import MarqueeDemo from './components/MarqueeDemo';
import InThePress from './components/InThePress';
import Speakers from './components/Speakers';
import FloatingBubbles from './components/FloatingBubbles';
import UpcomingEvent from './components/UpcomingEvent';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import ChatWidget from './components/chat/ChatWidget';
import SpeakersPage from './pages/SpeakersPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import PendingPage from './pages/PendingPage';
import AdminCheckIn from './pages/AdminCheckIn';
import AdminTools from './pages/AdminTools';
import AdminSMS from './pages/admin/AdminSMS';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AddEvent from './pages/admin/AddEvent';
import EventManagement from './pages/admin/EventManagement';
import SpeakerManagement from './pages/admin/SpeakerManagement';
import UserManagement from './pages/admin/UserManagement';
import PendingRegistrations from './pages/admin/PendingRegistrations';
import SystemTestPage from './pages/admin/SystemTestPage';
import SpeakerDashboard from './pages/SpeakerDashboard';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ConnectPage from './pages/ConnectPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthWrapper from './components/auth/AuthWrapper';
import NetworkStatusIndicator from './components/ui/NetworkStatusIndicator';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Home page component
const HomePage = () => (
  <div className="min-h-screen bg-white">
    <Header />
    <Hero />
    <About />
    <MarqueeDemo />
    <InThePress />
    <Speakers />
    <FloatingBubbles />
    <UpcomingEvent />
    <FAQ />
    <Footer />
    <ChatWidget />
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/speakers" element={<SpeakersPage />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Connection Route */}
        <Route path="/connect" element={<ConnectPage />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events" 
          element={
            <ProtectedRoute>
              <EventsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/:slug" 
          element={
            <ProtectedRoute>
              <EventDetailPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/complete-profile" 
          element={
            <ProtectedRoute>
              <CompleteProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/speaker-dashboard" 
          element={
            <ProtectedRoute>
              <SpeakerDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin-tools" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTools />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/sms" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSMS />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/announcements" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminAnnouncements />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/events" 
          element={
            <ProtectedRoute requiredRole="admin">
              <EventManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/events/create" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddEvent />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/speakers" 
          element={
            <ProtectedRoute requiredRole="admin">
              <SpeakerManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute requiredRole="admin">
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/pending-registrations" 
          element={
            <ProtectedRoute requiredRole="admin">
              <PendingRegistrations />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/system-test" 
          element={
            <ProtectedRoute requiredRole="admin">
              <SystemTestPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={<Navigate to="/admin-tools" replace />} 
        />
        <Route 
          path="/admin/check-in" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminCheckIn />
            </ProtectedRoute>
          } 
        />
        
        {/* Legacy routes - redirect to new format */}
        
        {/* Catch-all route for 404s */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Network Status Indicator */}
      <NetworkStatusIndicator position="bottom-right" />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </Router>
  );
}

export default App;