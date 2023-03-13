FROM node:16
WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN npm run lint:fix
EXPOSE 8005
CMD [ "npm", "start" ]