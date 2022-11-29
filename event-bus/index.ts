import axios from 'axios';
import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

app.post('/events', async (req: Request, res: Response) => {
  const event = req.body;

  axios.post('http://localhost:4000/events', event).catch((err) => {
    console.log(err.message);
  });
  axios.post('http://localhost:4001/events', event).catch((err) => {
    console.log(err.message);
  });
  axios.post('http://localhost:4002/events', event).catch((err) => {
    console.log(err.message);
  });
  axios.post('http://localhost:4003/events', event).catch((err) => {
    console.log(err.message);
  });

  res.send({ status: 'OK' });
});

app.listen(4005, () => {
  console.log('Listening on port 4005');
});