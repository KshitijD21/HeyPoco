import { createBrowserRouter, Outlet } from "react-router";
import { LogProvider } from "./context/LogContext";
import { VoiceInterface } from "./components/VoiceInterface";
import { Feed } from "./pages/Feed";
import { Snapshot } from "./pages/Snapshot";

const RootLayout = () => (
  <LogProvider>
    <div className="max-w-md mx-auto h-screen bg-white shadow-2xl overflow-hidden font-sans text-gray-900 selection:bg-gray-200">
       <Outlet />
    </div>
  </LogProvider>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <VoiceInterface /> },
      { path: "feed", element: <Feed /> },
      { path: "snapshot", element: <Snapshot /> },
    ]
  }
]);
