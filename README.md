# Axios Concurrency Manager

Get control of concurrent requests of any [axios](https://github.com/axios/axios) instance.
Implemented using axios interceptors

## Installing

```bash
$ npm install axios-concurrecy
```

## Example

```js
const { ConcurrencyManager } = require("axios-concurrency");
const axios = require("axios");

let api = axios.create({
  baseURL: "http://mypublicapi.com"
});

// init your manager.
const MAX_CONCURRENT_REQUESTS = 5;

// a concurrency parameter of 1 makes your api all requests secuential
const manager = ConcurrencyManager(api, MAX_CONCURRENT_REQUESTS);

// requests will be sent in batches determined by MAX_CONCURRENT_REQUESTS
Promise.all(manyIds.map(id => api.get(`/test/${id}`)))
  .then(responses => {
    // ...
  });

// to stop using the concurrency manager.
// will eject the response and reponse handlers from your instance
manager.detach()
```

## License

MIT
