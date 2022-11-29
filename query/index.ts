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
  status: string;
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

const handleEvent = (type: string, data: any) => {
  if (type === 'PostCreated') {
    const { id, title } = data;
    postsCollection[id] = {
      id,
      title,
      comments: [],
    };
  }

  if (type === 'CommentCreated') {
    const { id, content, postId, status } = data;
    const post = postsCollection[postId];
    post.comments.push({ id, content, status });
  }

  if (type === 'CommentUpdated') {
    const { id, content, postId, status } = data;
    const post = postsCollection[postId];
    const comment = post.comments.find((comment) => comment.id === id);
    if(comment) {
      comment.status = status;
      comment.content = content;
    }
  }
};

app.get('/posts', (req: Request, res: Response) => {
  res.send(postsCollection);
});

app.post('/events', (req: Request, res: Response) => {
  const { type, data } = req.body;

  handleEvent(type, data);

  res.send({});
});

app.listen(4002, () => {
  console.log('Listening on port 4002');

  axios.get('http://localhost:4005/events').then((res) => {
    for (let event of res.data) {
      console.log('Processing event:', event.type);
      handleEvent(event.type, event.data);
    }
  }).catch((err) => {
    console.log(err.message);
  });
});
