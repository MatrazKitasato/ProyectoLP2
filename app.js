require('dotenv').config();
const express = require('express');
const path = require('path');

const negocioRoutes = require('./routes/negocioRoutes');
const comedorRoutes = require('./routes/comedorRoutes');
const publicacionRoutes = require('./routes/publicacionRoutes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/negocios', negocioRoutes);
app.use('/api/comedores', comedorRoutes);
app.use('/api/publicaciones', publicacionRoutes);

// Manejador de errores de respaldo
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ayni escuchando en http://localhost:${PORT}`);
});