# serverless

`index.js` and `package.json` will be archived and passed into Google Cloud.
GCP will auto read `package.json` and install all dependencies.

```javascript
functions.cloudEvent('verifyLink', async (cloudEvent) => {
	// Cloud function body
});
```

In `index.js`, the code outside of the above block will run when the cloud function first deployed.
The block above will run after every time it receives a "verifyLink" signal. And this signal comes from pub/sub in our webapp.

#### archive

`archive.sh` is used to archive `index.js` and `package.json` into a `zip` file, so that it can be stored in a GCP bucket.
Every time you run this shell script (`sh archive.sh`), there will be a `zip` file ready in the same directory.
Then `tf-gcp-infra` repo will auto use this file.
