import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { GameLeaderboard } from "./pages/GameLeaderboard";
import { AdminPanel } from "./pages/AdminPanel";
import { TournamentProvider } from "./context/TournamentContext";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: () => (
      <TournamentProvider>
        <Layout />
      </TournamentProvider>
    ),
    children: [
      { index: true, Component: Overview },
      { path: "game/:gameId", Component: GameLeaderboard },
      { path: "admin", Component: AdminPanel },
    ],
  },
]);
