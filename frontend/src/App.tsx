import { BrowserRouter, Routes, Route } from "react-router";
import Home from "./pages/Home";
import CheckIn from "./pages/CheckIn";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checkin" element={<CheckIn />} />
      </Routes>
    </BrowserRouter>
  );
}
