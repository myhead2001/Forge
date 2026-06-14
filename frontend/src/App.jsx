import React, { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState('LOADING');

  useEffect(() => {
    fetch('http://localhost:8080/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setStatus(data.status);
      })
      .catch(() => {
        setStatus('ERROR');
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Forge Workspace Monitor</h1>
      <div>
        Backend Health Status: <strong data-testid="status">{status}</strong>
      </div>
    </div>
  );
}

export default App;
