# Discord Bot UC

## Set Env

```bash
cat .env.example > .env
```

## Run With Docker

```bash
docker build -t discord-bot-node .
docker run --env-file .env discord-bot-node
```

## Run With Node

### With Build

```bash
npm run build
npm run start
```

### With Dev

```bash
npm run dev
```
