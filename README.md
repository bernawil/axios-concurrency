# Axios Concurrency Manager

Get control of concurrent requests of any [axios](https://github.com/axios/axios) instance.
Implemented using axios interceptors

## Installing

```bash
$ npm install axios-concurrency
```

## Example

```js
const { ConcurrencyManager } = require("axios-concurrency");
const axios = require("axios");

let api = axios.create({
  baseURL: "http://mypublicapi.com"
});

// a concurrency parameter of 1 makes all api requests secuential
const MAX_CONCURRENT_REQUESTS = 5;

// init your manager.
const manager = ConcurrencyManager(api, MAX_CONCURRENT_REQUESTS);

// requests will be sent in batches determined by MAX_CONCURRENT_REQUESTS
Promise.all(manyIds.map(id => api.get(`/test/${id}`)))
  .then(responses => {
    // ...
  });

// to stop using the concurrency manager.
// will eject the request and response handlers from your instance
manager.detach()
```

## License

MIT
