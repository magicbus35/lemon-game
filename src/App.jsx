// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import RankingPage from "./pages/RankingPage";
import ResultPage from "./pages/ResultPage";
import SupaTest from "./pages/SupaTest";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 홈 분리 */}
        <Route path="/" element={<HomePage />} />
        {/* 실제 게임 경로 */}
        <Route path="/game" element={<GamePage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/_test" element={<SupaTest />} />
        {/* 안전망 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
