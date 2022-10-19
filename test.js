import assert from "assert";
import crypto from "crypto";
import http from "http";

import axios from "axios";
import mocha from "mocha";

import {ConcurrencyManager} from "./index.js";

const OK = 200;
const BAD_REQUEST = 400;
const LISTENING_PORT = 3333;
const MAX_RANDOM_INT = 2000;
const MAX_CONCURRENT_REQUESTS = 5;
const TEST_SERVER_URL = `http://localhost:${LISTENING_PORT}`;

const server = http.createServer(async (req, res) => {
  const nb = crypto.randomInt(500);
  await new Promise(resolve => setTimeout(resolve, 40));
  let status = OK;
  const response = {
    date: Date.now(),
  };
  if (req.url === "/fail") {
    status = BAD_REQUEST;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(response));
});

describe("axios-concurency", () => {
  let api;

  before(() => {
    server.listen(LISTENING_PORT, err => {
      if (err) {
        console.error(err);
        throw new Error(`Can't create test server on port ${LISTENING_PORT}`);
      }
    });
  });

  after(() => {
    server.close(err => {
      if (err) {
        console.error(err);
        throw new Error("Can't stop test server");
      }
    });
  });

  describe("Without concurrency manager", () => {
    let api;

    before(() => {
      api = axios.create({baseURL: TEST_SERVER_URL});
    });

    it("should send all call simultaneously", async () => {
      const nbCalls = 40;
      const pArray = new Array(nbCalls).fill(() => api.get("/test"));
      let smallest = Date.now() + 10000;
      let biggest = Date.now();
      const responses = await Promise.all(pArray.map(p => p()));
      assert.strictEqual(
        responses.length,
        nbCalls,
        `Expecting ${nbCalls} but got ${responses.length}`,
      );
      for (const response of responses) {
        assert.strictEqual(typeof response.data.date, "number");
        const date = response.data.date;
        if (date < smallest) smallest = date;
        if (date > biggest) biggest = date;
      }
      assert(biggest - smallest < 100, "Axios doesn't behave as expected, maybe your computer is really slow");
    });
  });

  describe("With concurency manager", () => {
    let api;
    let manager;

    before(() => {
      api = axios.create({
        baseURL: TEST_SERVER_URL,
        validateStatus: status => [OK, BAD_REQUEST].includes(status),
      });
      manager = ConcurrencyManager(api, MAX_CONCURRENT_REQUESTS);
    });

    it(`should send all call but only ${MAX_CONCURRENT_REQUESTS} at time`, async () => {
      const nbCalls = 40;
      const pArray = new Array(nbCalls).fill(() => api.get("/test"));
      let smallest = Date.now() + 10000;
      let biggest = Date.now();
      const responses = await Promise.all(pArray.map(p => p()));
      assert.strictEqual(
        responses.length,
        nbCalls,
        `Expecting ${nbCalls} but got ${responses.length}`,
      );
      for (const response of responses) {
        assert.strictEqual(typeof response.data.date, "number");
        const date = response.data.date;
        if (date < smallest) smallest = date;
        if (date > biggest) biggest = date;
      }
      assert(biggest - smallest > 100, "The calls are not handle buy the concurrency manager");
    });

    it(`should handle both success and failed call`, async () => {
      const nbFailed = 6;
      const nbSuccess = 4;
      const nbCalls = nbFailed + nbSuccess;
      const pArray = [
        ...new Array(nbFailed).fill(() => api.get("/fail")),
        ...new Array(nbSuccess).fill(() => api.get("/success")),
      ];
      let smallest = Date.now() + 10000;
      let biggest = Date.now();
      const responses = await Promise.all(pArray.map(p => p()));
      assert.strictEqual(
        responses.length,
        nbCalls,
        `Expecting ${nbCalls} but got ${responses.length}`,
      );
      for (const response of responses) {
        assert.strictEqual(typeof response.data.date, "number");
        const date = response.data.date;
        if (date < smallest) smallest = date;
        if (date > biggest) biggest = date;
      }
      assert(biggest - smallest > 40, "The calls are not handle buy the concurrency manager");
      for (let i = 0; i < nbCalls; i++) {
        const response = responses[i];
        if (i < nbFailed) {
          assert.strictEqual(response.status, BAD_REQUEST);
        } else {
          assert.strictEqual(response.status, OK);
        }
      }
    });
  });

  describe("After detaching the concurency manager", () => {
    let api;
    let manager;

    before(() => {
      api = axios.create({baseURL: TEST_SERVER_URL});
      manager = ConcurrencyManager(api, MAX_CONCURRENT_REQUESTS);
      manager.detach();
    });

    it("should send all call simultaneously", async () => {
      const nbCalls = 40;
      const pArray = new Array(nbCalls).fill(() => api.get("/test"));
      let smallest = Date.now() + 10000;
      let biggest = Date.now();
      const responses = await Promise.all(pArray.map(p => p()));
      assert.strictEqual(
        responses.length,
        nbCalls,
        `Expecting ${nbCalls} but got ${responses.length}`,
      );
      for (const response of responses) {
        assert.strictEqual(typeof response.data.date, "number");
        const date = response.data.date;
        if (date < smallest) smallest = date;
        if (date > biggest) biggest = date;
      }
      assert(biggest - smallest < 100, "The concurrency manager has not be detached or your computer is really slow");
    });
  });
});
