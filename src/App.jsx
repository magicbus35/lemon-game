// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import RankingPage from "./pages/RankingPage";
import ResultPage from "./pages/ResultPage";

export default function App() {
  return (
    <Routes>
      {/* 레이아웃 라우트: AppLayout 내부의 <Outlet/> 자리에 아래 자식들이 렌더됩니다 */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Route>

      {/* 없는 경로는 홈으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
