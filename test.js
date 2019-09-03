const { ConcurrencyManager } = require("./index");
const axios = require("axios");
const http = require("http");
const port = 3333;
const assert = require("assert");
const exit = status => {
  if (status) console.log("Tests successful");
  if (!status) console.log("Tests failed");
  process.exit(+!status);
};

const randomInteger = () => Math.floor(Math.random() * 2000 + 100);
const sequence = n => {
  let seq = [];
  for (i = 0; i < n; i++) {
    seq.push(i);
  }
  return seq;
};

const wrapPromise = (p) => {
  return p.then(
    result => ({result, success: true}),
    result => ({result, success: false}),
  )
};

let api = axios.create({
  baseURL: `http://localhost:${port}`
});

const MAX_CONCURRENT_REQUESTS = 5;
const manager = ConcurrencyManager(api, MAX_CONCURRENT_REQUESTS);

const server = http.createServer((req, res) => {

  if (req.url === '/fail') {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ errorCode: 400 }));
  }

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

  setTimeout(() => {
    console.error('Some requests got stuck.');
    exit(false);
  }, 1000);

  // Test many simultaneous requests
  Promise.all(sequence(40).map(() => api.get("/test")))
    .then(responses => {
      return responses.map(r => r.data);
    })
    .then(objects => {
      assert(objects.length === 40);
      objects.forEach(obj => {
        assert(typeof obj.randomInteger === "number");
      });
    })
    // Test sequence of failed and success responses. Check that errors are processed as expected
    .then(() => Promise.all(
      sequence(6).map(() => wrapPromise(api.get("/fail")))
        .concat(
          sequence(4).map(() => wrapPromise(api.get("/test")))
        )
    ))
    .then(responses => {
      assert(responses.length === 10);
      responses.slice(0, 6).forEach(response => {
        assert(response.success === false);
        assert(response.result.response.data.errorCode === 400);
      });
      responses.slice(6).forEach(response => {
        assert(response.success === true);
        assert(typeof response.result.data.randomInteger === "number");
      });
    })
    // Test after detaching manager
    .then(() => {
      // test without manager
      manager.detach();
      return Promise.all(sequence(40).map(() => api.get("/test")));
    })
    .then(responses => {
      return responses.map(r => r.data);
    })
    .then(objects => {
      objects.forEach(obj => {
        assert(typeof obj.randomInteger === "number");
      });
    })
    .then(() => exit(true))
    .catch((error) => {
      console.error(error);
      exit(false)
    });

});
