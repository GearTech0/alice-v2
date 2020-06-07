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

### Set up
After installing `ts-node`, add a bot-token to `token` and another (optionally) to `tokendev` inside of `secret/auth.template.json`. Rename `secret/auth.template.json` to `secret/auth.json`. Set environment variable `NODE_ENV` to either `production` or `development` depending on if you would like to use the `token` or `tokendev` value, respectively, for the bot.
```
npm run-script dev
```
You should see the code start with a response like:
```
Connected
Logged in as:
Alice - (##)
```
