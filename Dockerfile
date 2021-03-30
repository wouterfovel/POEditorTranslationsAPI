FROM node:15-alpine as node

RUN mkdir -p /app

COPY package.json package-lock.json /app/

WORKDIR /app

RUN npm ci

COPY . /app

CMD [ "npm", "run", "start" ]
