# Byggekontekst er REPO-RODEN, ikke cosurg-mcp/ — kilderne og traeerne ligger
# i naboemapper og skal bages ind i imaget:
#
#   docker build -f cosurg-mcp/Dockerfile -t cosurg-mcp .
#
# Sluttrinnet er distroless: ingen shell, ingen pakkemanager, ~180 MB, koerer som
# non-root. Det passer til NSL-serverens begraensede RAM.

# ---------- byg ----------
FROM node:22-alpine AS byg
WORKDIR /app

COPY cosurg-mcp/package.json cosurg-mcp/package-lock.json ./
RUN npm ci

COPY cosurg-mcp/tsconfig.json ./
COPY cosurg-mcp/src ./src
RUN npm run build

# Kun produktionsafhaengigheder med i det faerdige image.
RUN npm ci --omit=dev

# ---------- data ----------
# Vidensbasen ligger i cosurg-mcp/data/kilder/ og kopieres til /app/data/kilder,
# saa stien er den samme i udvikling og i drift.
#
# KUN filer herfra bliver til vidensbasen. Arrangoerens syntetiske patientjournaler
# ligger i cosurg-mcp/test-data/ og maa ALDRIG kopieres ind her — se
# cosurg-mcp/data/README.md.
FROM alpine:3.20 AS data
WORKDIR /data
COPY cosurg-mcp/data/kilder/*.md ./kilder/
COPY cosurg/content/trees/*.json ./trees/

# ---------- koer ----------
FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app

COPY --from=byg /app/node_modules ./node_modules
COPY --from=byg /app/dist ./dist
COPY --from=byg /app/package.json ./package.json
COPY --from=data /data ./data

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    MCP_PATH=/mcp \
    COSURG_KILDE_DIR=/app/data/kilder \
    COSURG_TRAE_DIR=/app/data/trees

EXPOSE 8787

# MCP_AUTH_TOKEN SKAL saettes ved kørsel — serveren naegter ellers at starte.
CMD ["dist/index.js"]
