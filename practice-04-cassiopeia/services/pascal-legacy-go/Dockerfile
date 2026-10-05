FROM golang:1.23-bookworm AS build
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/pascal-legacy-go .

FROM postgres:16-alpine
WORKDIR /app
COPY --from=build /out/pascal-legacy-go /usr/local/bin/pascal-legacy-go
COPY entrypoint.sh /usr/local/bin/pascal-legacy-entrypoint
RUN chmod +x /usr/local/bin/pascal-legacy-entrypoint && mkdir -p /data/csv
ENTRYPOINT ["/usr/local/bin/pascal-legacy-entrypoint"]
