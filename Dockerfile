FROM node:18.20.3
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN mkdir -p cookies
COPY . .
EXPOSE 1234
CMD ["yarn", "start"]
