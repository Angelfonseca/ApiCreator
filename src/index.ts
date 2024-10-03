import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import route from './routes/routes';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, '../views')); 

app.get('/', (req, res) => {
  res.render('welcome');
});

app.get('/generator', (req, res) => {
  res.render('index');
});

app.use('/api', route);

const PORT = parseInt(process.env.PORT as string, 10) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
