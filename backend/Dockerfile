# syntax=docker/dockerfile:1
# Plain Go school API for Cloudflare Containers (linux/amd64).
FROM golang:1.26-alpine AS build
WORKDIR /src
ARG TARGETOS=linux
ARG TARGETARCH=amd64
ENV GOTOOLCHAIN=auto
RUN apk add --no-cache ca-certificates git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -ldflags="-s -w" -o /bin/school-api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /bin/school-api /school-api
EXPOSE 8080
ENV PORT=8080
USER nonroot:nonroot
CMD ["/school-api"]
