import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { randomUUID } from 'crypto';

const app: Express = express();
app.use(bodyParser.json());

interface Comment {
  id: string;
  content: string;
}

interface CommentsByPost {
  [key: string]: Comment[];
}

const commentsByPostId = {} as CommentsByPost;


app.get('/posts/:id/comments', (req: Request, res: Response) => {
  res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', (req: Request, res: Response) => {
  const commentId = randomUUID();
  const { content } = req.body;
  const { id: postId } = req.params;

  const comments = commentsByPostId[postId] || [];

  comments.push({ id: commentId, content });

  commentsByPostId[postId] = comments;

  res.status(201).send(comments)
})


app.listen(4001, () => {
  console.log('Listening on port 4001');
});
