#!/bin/sh
echo "
{
  \"token\": \"$ALICE_TOKEN\",
  \"tokendev\": \"$ALICE_TOKENDEV\",
}
" > /home/node/secret/auth.json
echo "added auth.json"

echo "going to project directory"
cd /home/node/

echo "starting npm"
npm run-script dev