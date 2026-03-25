import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAuthInit } from '@/hooks/useAuth'

// Layouts
import AppLayout from '@/components/layout/AppLayout'
import AttendanceLayout from '@/components/layout/AttendanceLayout'
import RsvpLayout from '@/components/layout/RsvpLayout'
import SeriesLayout from '@/components/layout/SeriesLayout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ConfirmPage from '@/pages/auth/ConfirmPage'

// App pages
import ProjectsPage from '@/pages/app/projects/ProjectsPage'
import MembersPage from '@/pages/app/members/MembersPage'
import WorkspaceSettingsPage from '@/pages/app/settings/WorkspaceSettingsPage'
import NotificationsPage from '@/pages/app/notifications/NotificationsPage'
import AccountPage from '@/pages/app/account/AccountPage'

// Attendance pages
import AttendanceCheckinPage from '@/pages/app/attendance/AttendanceCheckinPage'
import AttendanceListPage from '@/pages/app/attendance/AttendanceListPage'
import AttendanceExcuseLinksPage from '@/pages/app/attendance/AttendanceExcuseLinksPage'
import AttendanceModerationPage from '@/pages/app/attendance/AttendanceModerationPage'
import AttendanceSettingsPage from '@/pages/app/attendance/AttendanceSettingsPage'

// RSVP pages
import RsvpFormPage from '@/pages/app/rsvp/RsvpFormPage'
import RsvpLinksPage from '@/pages/app/rsvp/RsvpLinksPage'
import RsvpSubmissionsPage from '@/pages/app/rsvp/RsvpSubmissionsPage'

// Series pages
import SeriesEventsPage from '@/pages/app/series/SeriesEventsPage'
import SeriesAttendeesPage from '@/pages/app/series/SeriesAttendeesPage'
import SeriesCollisionsPage from '@/pages/app/series/SeriesCollisionsPage'
import SeriesSettingsPage from '@/pages/app/series/SeriesSettingsPage'

// Public pages
import AttendFormPage from '@/pages/public/AttendFormPage'
import ExcuseFormPage from '@/pages/public/ExcuseFormPage'
import ModerationViewPage from '@/pages/public/ModerationViewPage'
import RsvpPublicPage from '@/pages/public/RsvpPublicPage'
import LandingPage from '@/pages/public/LandingPage'
import ImprintPage from '@/pages/public/ImprintPage'
import PrivacyPage from '@/pages/public/PrivacyPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuthStore()
  if (loading) return <div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading…</div>
  if (!profile) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuthStore()
  if (loading) return <div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading…</div>
  if (profile) return <Navigate to="/app/projects" replace />
  return <>{children}</>
}

export default function App() {
  useAuthInit()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/imprint" element={<ImprintPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Public forms */}
      <Route path="/attend/:codeId" element={<AttendFormPage />} />
      <Route path="/excuse/:linkId" element={<ExcuseFormPage />} />
      <Route path="/moderate/:linkId" element={<ModerationViewPage />} />
      <Route path="/rsvp/:linkId" element={<RsvpPublicPage />} />

      {/* Auth routes */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/confirm" element={<ConfirmPage />} />

      {/* Protected app routes */}
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="settings" element={<WorkspaceSettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="account" element={<AccountPage />} />

        {/* Attendance object */}
        <Route path="attendance/:eventId" element={<AttendanceLayout />}>
          <Route index element={<Navigate to="checkin" replace />} />
          <Route path="checkin" element={<AttendanceCheckinPage />} />
          <Route path="list" element={<AttendanceListPage />} />
          <Route path="excuse-links" element={<AttendanceExcuseLinksPage />} />
          <Route path="moderation" element={<AttendanceModerationPage />} />
          <Route path="settings" element={<AttendanceSettingsPage />} />
        </Route>

        {/* RSVP object */}
        <Route path="rsvp/:rsvpId" element={<RsvpLayout />}>
          <Route index element={<Navigate to="form" replace />} />
          <Route path="form" element={<RsvpFormPage />} />
          <Route path="links" element={<RsvpLinksPage />} />
          <Route path="submissions" element={<RsvpSubmissionsPage />} />
        </Route>

        {/* Series object */}
        <Route path="series/:seriesId" element={<SeriesLayout />}>
          <Route index element={<Navigate to="events" replace />} />
          <Route path="events" element={<SeriesEventsPage />} />
          <Route path="attendees" element={<SeriesAttendeesPage />} />
          <Route path="collisions" element={<SeriesCollisionsPage />} />
          <Route path="settings" element={<SeriesSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
