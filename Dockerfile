FROM oven/bun:1-debian

COPY . .

ARG SOURCE_COMMIT
ENV SOURCE_COMMIT=${SOURCE_COMMIT}

RUN apt-get update -y && apt-get install -y openssl
RUN bun install
RUN bunx prisma generate
RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]