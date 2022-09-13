FROM amd64/node:alpine
RUN yarn global add pm2
WORKDIR /app
COPY package.json .
RUN yarn install
COPY app.js .
COPY customers.js .
CMD [ "pm2-runtime", "app.js" ]
