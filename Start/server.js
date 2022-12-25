const http = require("http");

const server = http.createServer((req, res) => {
  //setting header --> we can add one or more header
  //res.setHeader("Content-Type", "text/plain");

  res.statusCode = 400;
  res.setHeader("Content-Type", "application/json");
  //   res.write("<h1>HI</h1>");
  res.end(JSON.stringify({ success: false, error: "Please" }));
});

const PORT = 5000;

server.listen(PORT, () => console.log(`Server runs on PORT ${PORT}`));
