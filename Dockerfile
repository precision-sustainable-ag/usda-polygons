FROM node:20

WORKDIR /
COPY . .
RUN npm install

EXPOSE 80
ENTRYPOINT npm start