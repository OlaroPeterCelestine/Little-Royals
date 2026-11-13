# Local-only gateway (on Cloudflare the Worker replaces this)
# syntax=docker/dockerfile:1
FROM golang:1.24-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY pkg ./pkg
COPY services/gateway ./services/gateway
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/gateway ./services/gateway

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /bin/gateway /app/gateway
EXPOSE 8080
ENV PORT=8080
USER nonroot:nonroot
CMD ["/app/gateway"]
