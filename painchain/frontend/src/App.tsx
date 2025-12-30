import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Integrations } from './pages/Integrations';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/integrations" element={<Integrations />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
