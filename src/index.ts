import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import route from './routes/routes';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Set the view engine to EJS
app.set('view engine', 'ejs');
// Update this line to point to the correct path
app.set('views', path.join(__dirname, '../views')); // Go one level up to find the views folder

app.get('/', (req, res) => {
  res.render('index'); // Render index.ejs
});

app.use('/api', route);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
