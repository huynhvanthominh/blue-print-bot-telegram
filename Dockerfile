FROM node:18.20.3
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 1234
CMD ["mkdir", "-p", "cookies"]
CMD ["yarn", "start"]
