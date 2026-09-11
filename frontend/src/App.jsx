import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/products';
import Orders from './pages/Orders';
import Suppliers from './pages/Suppliers';

const Placeholder = ({ title }) => <h2 className="text-2xl font-bold">{title} Page</h2>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          {/* This now correctly points to your real Products file */}
          <Route path="products" element={<Products />} /> 
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="settings" element={<Placeholder title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;