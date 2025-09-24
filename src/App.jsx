import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import LemonGamePage from "./pages/LemonGamePage"; // 기존 GamePage를 파일명만 바꿨다면 여기 반영
import SudokuPage from "./pages/SudokuPage";
import RankingPage from "./pages/RankingPage";
import { ThemeProvider } from "./theme/ThemeProvider";
import { BirdyModeProvider } from "./context/BirdyMode";

export default function App() {
  return (
    <ThemeProvider>
      <BirdyModeProvider>
        <Router>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/lemon-game" element={<LemonGamePage />} />
              <Route path="/sudoku" element={<SudokuPage />} />
              <Route path="/ranking" element={<RankingPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </BirdyModeProvider>
    </ThemeProvider>
  );
}
