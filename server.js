require("dotenv").config();

const app = require("./src/app");

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`);
  console.log(`Dokumentasi: http://localhost:${port}/docs`);
});

