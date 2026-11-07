FROM apify/actor-node-puppeteer-chrome:22
COPY --chown=myuser package*.json ./
RUN npm install --omit=dev --omit=optional --no-audit --no-fund
COPY --chown=myuser . ./
CMD npm start --silent
