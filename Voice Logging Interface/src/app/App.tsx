import { RouterProvider } from 'react-router';
import { router } from './routes';
import '../styles/fonts.css';
import '../styles/theme.css'; // Assuming theme.css is present or needs to be

function App() {
  return <RouterProvider router={router} />;
}

export default App;
