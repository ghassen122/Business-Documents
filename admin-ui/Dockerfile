FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --include=optional
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
EXPOSE 4002
CMD ["npm", "run", "start"]
