require('dotenv').config();

const express = require('express');
const path  = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = 'https://3adc-2001-4451-9a3-9c00-c60-e16a-bb86-691d.ngrok-free.app/callback.html';

app.post('/get_token', async (req, res) => {
  const code = req.body.code;

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirect_uri);
  params.append('client_id', client_id);
  params.append('client_secret', client_secret);

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('Token exchange failed');
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})