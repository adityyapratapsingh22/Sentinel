import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { useHashRoute } from "./hooks/useHashRoute.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Lab from "./pages/Lab.jsx";
import History from "./pages/History.jsx";
import Analytics from "./pages/Analytics.jsx";
import Profile from "./pages/Profile.jsx";

function Protected({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    window.location.hash = "#/login";
    return null;
  }
  return children;
}

function Router() {
  const route = useHashRoute();

  if (route === "/login") return <Login />;

  let page;
  let activeKey;

  if (route === "/history") {
    page = (
      <Protected>
        <History />
      </Protected>
    );
    activeKey = "history";
  } else if (route === "/analytics") {
    page = (
      <Protected>
        <Analytics />
      </Protected>
    );
    activeKey = "analytics";
  } else if (route === "/profile") {
    page = (
      <Protected>
        <Profile />
      </Protected>
    );
    activeKey = "profile";
  } else if (route === "/lab") {
    page = (
      <Protected>
        <Lab />
      </Protected>
    );
    activeKey = "lab";
  } else {
    // default route "/" — public landing page, no auth required
    page = <Landing />;
    activeKey = "landing";
  }

  return (
    <>
      <Header active={activeKey} />
      {page}
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

