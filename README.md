## How to build and run in dev mode
### Installing ts-node ([information from original package page](https://www.npmjs.com/package/ts-node)):
```
# Locally in your project. 
npm install -D typescript
npm install -D ts-node
 
# Or globally with TypeScript. 
npm install -g typescript
npm install -g ts-node
```

# Set up
After installing `ts-node`, add a bot-token to `token` and another (optionally) to `tokendev` inside of `secret/auth.template.json`. Rename `secret/auth.template.json` to `secret/auth.json`.

## Terminal Use
Set environment variable `NODE_ENV` to either `production` or `development` depending on if you would like to use the `token` or `tokendev` value, respectively.

Then use the following command in your respective terminal at the root of the project:
```
npm run-script dev
```

## Docker Use
Use the following commands with your respective OS:
```
# Unix
docker-compose build
NODE_ENV=<stage> docker-compose up

# Windows
docker-compose build
$env:NODE_ENV="<stage>"; docker-compose up
```
*Note: you only need to specify `NODE_ENV` in the command if you have not done so locally.* 
