FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends fpc postgresql-client ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY legacy.pas .
RUN fpc -O2 -S2 legacy.pas

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/legacy /app/legacy
COPY entrypoint.sh /usr/local/bin/legacy-entrypoint
RUN chmod +x /usr/local/bin/legacy-entrypoint && mkdir -p /data/csv
ENTRYPOINT ["/usr/local/bin/legacy-entrypoint"]
