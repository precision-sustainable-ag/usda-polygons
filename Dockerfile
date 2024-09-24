FROM node:16

WORKDIR /
COPY . .
RUN npm install

EXPOSE 80
ENTRYPOINT npm start