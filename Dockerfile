FROM oven/bun:1.2.0 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN rm -rf apps/api/node_modules apps/web/node_modules \
  && ln -s ../../node_modules apps/api/node_modules \
  && ln -s ../../node_modules apps/web/node_modules
RUN bun run build

FROM oven/bun:1.2.0 AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/node_modules node_modules
RUN ln -s ../../node_modules apps/api/node_modules \
  && ln -s ../../node_modules apps/web/node_modules

EXPOSE 3000
CMD ["bun", "run", "railway:start"]
