import express from 'express';
import path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3001;

// Priority serve any static files.
app.use(express.static(path.resolve(__dirname, '../client/dist')));

app.use(bodyParser.urlencoded({ extended: true, limit: '8mb' }));
app.use(bodyParser.json({ limit: '8mb' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(
	cors({
		origin: '*',
	})
);

// Answer API requests.
app.get('/api/', (req, res) => {
	res.json({ message: 'Welcome to the Service API!' });
});

// All remaining requests return the React app, so it can handle routing.
app.get('*', function (req, res) {
	res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
});

app.listen(PORT, function () {
	console.error(
		`Node cluster worker ${process.pid}: listening on port ${PORT}`
	);
});
