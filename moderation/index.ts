import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app: Express = express();
app.use(bodyParser.json());

function isApproved(content: string): boolean {
  const isContentApproved = !content.includes('orange');

  return isContentApproved;
}


app.post('/events', async (req: Request, res: Response) => {
  const { type, data } = req.body;

  if (type === 'CommentCreated') {
    const status = isApproved(data.content) ? 'approved' : 'rejected';

    await axios.post('http://localhost:4005/events', {
      type: 'CommentModerated',
      data: {
        id: data.id,
        postId: data.postId,
        status,
        content: data.content,
      },
    }).catch((err) => {
      console.log(err.message);
    });
  }

  res.send({})
});

app.listen(4003, () => {
  console.log('Listening on port 4003');
});