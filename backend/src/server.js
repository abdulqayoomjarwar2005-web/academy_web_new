const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Nation Builders Institute of Learning Larkana API running on port ${PORT}`);
});
