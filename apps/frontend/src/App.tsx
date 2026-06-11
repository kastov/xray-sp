import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StatusPage } from './pages/StatusPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StatusPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<StatusPage />} />
      </Routes>
    </BrowserRouter>
  );
}
