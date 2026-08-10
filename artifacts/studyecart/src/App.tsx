import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AttendancePage, Courses, Dashboard, Departments, LoginPage, StudentEditor, StudentProfile, Students } from '@/pages/study-pages';
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from 'wouter';
import { AppShell } from '@/components/app-shell';
import { ErrorBoundary } from '@/components/error-boundary';

const queryClient = new QueryClient();

function AuthGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  if (!localStorage.getItem('studyecart_token') && location !== '/login') return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  return <AuthGate><Switch>
    <Route path="/login" component={LoginPage} />
    <Route path="/" component={Dashboard} />
    <Route path="/students/new" component={() => <StudentEditor />} />
    <Route path="/students/:id/edit" component={() => <StudentEditor edit />} />
    <Route path="/students/:id" component={StudentProfile} />
    <Route path="/students" component={Students} />
    <Route path="/departments" component={Departments} />
    <Route path="/courses" component={Courses} />
    <Route path="/attendance" component={AttendancePage} />
    <Route component={NotFound} />
  </Switch></AuthGate>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;