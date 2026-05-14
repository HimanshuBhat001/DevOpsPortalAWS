const BASE = 'http://localhost:5000';

export const loginUser = async (username, password) => {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
};

export const deployRepo = async (token, repo, branch) => {
  const res = await fetch(`${BASE}/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ repo, branch }),
  });
  return res.json();
};

export const fetchLogs = async () => {
  const res = await fetch(`${BASE}/logs`);
  return res.json();
};

export const fetchMetrics = async () => {
  const res = await fetch(`${BASE}/metrics`);
  return res.json();
};

export const sendChatMessage = async (message) => {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return res.json();
};

