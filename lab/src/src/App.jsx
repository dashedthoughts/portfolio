import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Project from './pages/Project.jsx';
import Play from './pages/Play.jsx';
import System from './pages/System.jsx';
import { InkDefs } from './components/Comic.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
    <InkDefs />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/p/:slug" element={<Project />} />
      <Route path="/play" element={<Play />} />
      <Route path="/system" element={<System />} />
      <Route path="*" element={<Project />} />
    </Routes>
    </>
  );
}
