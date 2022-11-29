import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app: Express = express();
app.use(bodyParser.json());

app.post('/events', async (req: Request, res: Response) => {
  res.send({})
});

app.listen(4003, () => {
  console.log('Listening on port 4003');
});