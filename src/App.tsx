import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navigation from "@/components/layout/Navigation";
import Dashboard from "@/pages/Dashboard";
import AddWord from "@/pages/AddWord";
import Learn from "@/pages/Learn";
import Statistics from "@/pages/Statistics";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import About from "@/pages/About";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

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

const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <>
      {user && <Navigation />}
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/add" element={<ProtectedRoute><AddWord /></ProtectedRoute>} />
        <Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
        <Route path="/statistics" element={<Navigate to="/stats" replace />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <LearningLanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner position="top-center" />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </LearningLanguageProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
