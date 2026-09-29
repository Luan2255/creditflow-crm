FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npm run db:generate

COPY . .

EXPOSE 3000
CMD ["sh", "-c", "npm run db:deploy && npm run db:seed && npm run dev"]