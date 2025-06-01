// server.js
const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('✅ JoinCoachify backend is live!');
});

app.post('/webhook/stripe', (req, res) => {
  console.log('Webhook received!');
  res.status(200).send({ received: true });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
