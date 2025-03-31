import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import BirthdaysPage from "@/pages/birthdays-page";
import GroupsPage from "@/pages/groups-page";
import UsersPage from "@/pages/users-page";
import { ProtectedRoute } from "./lib/protected-route";
import { useAuth } from "./hooks/use-auth";

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/birthdays" component={BirthdaysPage} />
      <ProtectedRoute path="/groups" component={GroupsPage} />
      {/* Only render the users page for admins */}
      {user?.role === "ADMIN" && (
        <ProtectedRoute path="/users" component={UsersPage} />
      )}
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
