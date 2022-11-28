import axios from 'axios';
import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors  from 'cors';

const app: Express = express();
app.use(bodyParser.json());
app.use(cors());

interface Comment {
  id: string;
  content: string;
}

interface PostWithComments {
  id: string;
  title: string;
  comments: Comment[];
}

interface PostsCollection {
  [key: string]: PostWithComments;
}

const postsCollection: PostsCollection = {} as PostsCollection;

app.get('/posts', (req: Request, res: Response) => {
  res.send({posts : []});
});

app.post('/events', (req: Request, res: Response) => {
  const { type, data } = req.body;

  if (type === 'PostCreated') {
    const { id, title } = data;
    postsCollection[id] = {
      id,
      title,
      comments: [],
    };
  }

  if (type === 'CommentCreated') {
    const { id, content, postId } = data;
    const post = postsCollection[postId];
    post.comments.push({ id, content });
  }

  console.log(postsCollection)

  res.send({});
});

app.listen(4002, () => {
  console.log('Listening on port 4002');
});
