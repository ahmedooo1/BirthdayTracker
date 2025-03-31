import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider'; // Ensure this path is correct

function App() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/groups')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => setGroups(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Switch>
          {/* ...existing routes... */}
        </Switch>
        {error && <div>Error fetching groups: {error}</div>}
      </Router>
    </AuthProvider>
  );
}

export default App;
