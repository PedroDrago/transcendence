FROM node:22-alpine

RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
