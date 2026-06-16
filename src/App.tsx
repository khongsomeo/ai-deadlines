import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ClockProvider } from "@/contexts/ClockContext";
import LoadingScreen from "@/components/LoadingScreen";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Calendar = lazy(() => import("./pages/Calendar"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClockProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="min-h-screen w-full" style={{ WebkitOverflowScrolling: "touch" }}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<LoadingScreen layout="grid" />}>
                      <Index />
                    </Suspense>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <Suspense fallback={<LoadingScreen layout="calendar" />}>
                      <Calendar />
                    </Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Suspense fallback={<LoadingScreen />}>
                      <NotFound />
                    </Suspense>
                  }
                />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ClockProvider>
  </QueryClientProvider>
);

export default App;
