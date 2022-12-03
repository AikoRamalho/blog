import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { randomUUID } from 'crypto';
import axios from 'axios';
import cors from 'cors';

const app: Express = express();
app.use(bodyParser.json());
app.use(cors());

interface Comment {
  id: string;
  content: string;
  status: string;
}

interface CommentsByPost {
  [key: string]: Comment[];
}

const commentsByPostId = {} as CommentsByPost;


app.get('/posts/:id/comments', (req: Request, res: Response) => {
  res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req: Request, res: Response) => {
  const commentId = randomUUID();
  const { content } = req.body;
  const { id: postId } = req.params;

  const comments = commentsByPostId[postId] || [];

  comments.push({ id: commentId, content, status: 'pending' });

  commentsByPostId[postId] = comments;

  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId,
      status: 'pending',
    },
  }).catch((err) => {
    console.log(err.message);
  });

  res.status(201).send(comments)
})

app.post('/events', (req: Request, res: Response) => {
  console.log('Received Event', req.body.type);

  const { type, data } = req.body;

  if (type === 'CommentModerated') {
    const { postId, id, status, content } = data;
    const comments = commentsByPostId[postId];

    const comment = comments.find((comment) => comment.id === id);

    if (comment) 
      comment.status = status;

    axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content,
      },
    }).catch((err) => {
      console.log(err.message);
    });
  }


  res.send({});
});


app.listen(4001, () => {
  console.log('Listening on port 4001');
});
