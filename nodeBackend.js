const express = require('express');
const app = express();

app.use(express.json());

app.post('/parse-team', (req, res) => {
  const teamText = req.body.team;
  const parsedTeam = parseShowdownTeam(teamText); // Use the parser above
  res.json(parsedTeam);
});

app.listen(3000, () => console.log('Server running on port 3000'));