import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/components/notifications/NotificationQueue";
import { AdminProvider, useAdminContext } from "@/contexts/AdminContext";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import Navigation from "@/components/layout/Navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
// Lazy load pages for better initial load performance
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AddWord = lazy(() => import("@/pages/AddWord"));
const Learn = lazy(() => import("@/pages/Learn"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const Auth = lazy(() => import("@/pages/Auth"));
const About = lazy(() => import("@/pages/About"));
const Friends = lazy(() => import("@/pages/Friends"));
const Admin = lazy(() => import("@/pages/Admin"));
const Dictation = lazy(() => import("@/pages/Dictation"));
const Books = lazy(() => import("@/pages/Books"));
const Mnemonics = lazy(() => import("@/pages/Mnemonics"));
const Premium = lazy(() => import("@/pages/Premium"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Install = lazy(() => import("@/pages/Install"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));

// Loading component for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse-soft text-muted-foreground">Yuklanmoqda...</div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 mins
      gcTime: 10 * 60 * 1000, // 10 minutes - cache for 10 mins (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      retry: 1, // Only retry once on failure
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// AdminRoute: uses AdminContext (cached has_role result — no extra RPC calls)
// Redirect to "/" (not "/unauthorized") to not reveal admin panel existence.
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { isAdmin, isAdminLoading } = useAdminContext();

  if (isLoading || isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, isLoading, isPasswordRecovery } = useAuth();
  const location = useLocation();
  const isLandingPage = location.pathname === '/lp';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <>
      {user && !isLandingPage && <Navigation />}
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><AddWord /></ProtectedRoute>} />
            <Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
            <Route path="/statistics" element={<Navigate to="/stats" replace />} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/dictation" element={<ProtectedRoute><Dictation /></ProtectedRoute>} />
            <Route path="/books" element={<ProtectedRoute><Books /></ProtectedRoute>} />
            <Route path="/mnemonics" element={<ProtectedRoute><Mnemonics /></ProtectedRoute>} />
            <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
            <Route path="/install" element={<Install />} />
            <Route path="/lp" element={<LandingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>
          <LanguageProvider>
            <LearningLanguageProvider>
              <GamificationProvider>
                <PremiumProvider>
                <TooltipProvider>
                  <NotificationProvider>
                    <Toaster position="top-center" richColors closeButton />
                    <BrowserRouter>
                      <AppRoutes />
                    </BrowserRouter>
                  </NotificationProvider>
                </TooltipProvider>
                </PremiumProvider>
              </GamificationProvider>
            </LearningLanguageProvider>
          </LanguageProvider>
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
