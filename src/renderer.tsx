import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  return <div>Hello World</div>;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}