import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GamePage from "./routes/GamePage";
import ResultPage from "./routes/ResultPage";
import RankingPage from "./routes/RankingPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/ranking" element={<RankingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
