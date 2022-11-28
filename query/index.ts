import axios from 'axios';
import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors  from 'cors';

const app: Express = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/posts', (req: Request, res: Response) => {
  res.send({posts : []});
});

app.post('/events', (req: Request, res: Response) => {
  console.log('Received Event', req.body.type);

  res.send({});
});

app.listen(4002, () => {
  console.log('Listening on port 4002');
});
