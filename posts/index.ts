import express, { Express, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';
import axios from 'axios';
import cors from 'cors';

const app: Express = express();
app.use(bodyParser.json());
app.use(cors());

interface Post {
  id: string;
  title: string;
}

interface PostsInterface {
  [key: string]: Post;
}

const posts: PostsInterface = {} as PostsInterface;

app.get('/posts', (req: Request, res: Response) => {
  res.send(posts);
});

app.post('/posts/create', async (req: Request, res: Response) => {
  const id = uuidv4();
  const { title } = req.body;
  posts[id] = {
    id,
    title,
  };

  await axios.post('http://event-bus-srv:4005/events', {
    type: 'PostCreated',
    data: {
      id,
      title,
    },
  }).catch((err: { message: any; }) => {
    console.log(err.message);
  });


  res.status(201).send(posts[id]);
});

app.post('/events', (req: Request, res: Response) => {
  console.log('Received Event', req.body.type);

  res.send({});
});

app.listen(4000, () => {
  console.log('v2');
  console.log('Listening on port 4000');
});
