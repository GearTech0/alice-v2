FROM node:14-alpine

MAINTAINER GearTech0

USER root

WORKDIR /home/node/

RUN apk update && apk add --no-cache git && apk upgrade

RUN npm install -g typescript && npm install -g ts-node

RUN rm -rf /var/cache/apk/* && npm cache clear --force && npm cache rm --force && npm cache verify
