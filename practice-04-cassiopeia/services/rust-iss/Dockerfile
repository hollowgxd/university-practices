FROM rust:1.85-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/rust_iss /usr/local/bin/rust_iss
ENV RUST_LOG=info
EXPOSE 3000
CMD ["rust_iss"]
