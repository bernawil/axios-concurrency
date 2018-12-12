const { ConcurrencyManager } = require("./index");
const axios = require("axios");
const http = require("http");
const port = 3333;
const assert = require("assert");
const exit = status => {
  if (status) console.log("Tests successful");
  if (!status) console.log("Tests failed");
  process.exit();
};

const randomInteger = () => Math.floor(Math.random() * 2000 + 100);
const sequence = n => {
  let seq = [];
  for (i = 0; i < n; i++) {
    seq.push(i);
  }
  return seq;
};

let api = axios.create({
  baseURL: `http://localhost:${port}`
});

const MAX_CONCURRENT_REQUESTS = 5;
const manager = ConcurrencyManager(api, MAX_CONCURRENT_REQUESTS);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ randomInteger: randomInteger() }));
});

server.listen(port, err => {
  if (err) {
    return console.log(
      `can't create test server on localhost port ${port}`,
      err
    );
  }

  // Send many simultaneous requests
  Promise.all(sequence(40).map(i => api.get("/test")))
    .then(responses => {
      return responses.map(r => r.data);
    })
    .then(objects => {
      objects.forEach(obj => {
        if (typeof obj.randomInteger !== "number") exit(false);
      });
    })
    .then(() => {
      // test without manager
      manager.detach();
      return Promise.all(sequence(40).map(i => api.get("/test")));
    })
    .then(responses => {
      return responses.map(r => r.data);
    })
    .then(objects => {
      objects.forEach(obj => {
        if (typeof obj.randomInteger !== "number") exit(false);
      });
    })
    .then(() => exit(true));
});
