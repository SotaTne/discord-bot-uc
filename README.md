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

## File構成

### レイヤーを分ける必要はないと思うので、utils,helper,typesなどを使って薄めのアーキテクチャを構築する

- helpers
  - エラーを返す,ロールを取得のような再利用して、外部に依存する(大きい副作用のある)関数を記述
  - ライブラリを使ったりする場合もここ
  
- utils
  - 主に計算のようなどこからいつ呼び出しても問題ないような、外部に依存しない関数
  - 乱数や、暗号化、複合化、ハッシュ化など

- commands
  - 実際に処理するコマンドの内容を書く
  - `data`と`execute`の二つをexportする

- actions
  - Discordのbotが自らメッセージを送信したりする時の関数
  - 発火などは別の場所でさせる

- index.ts
  - ボットを動かす時に使われるファイル
  - サーバーの起動、コマンドの登録、コマンド等の実行などが当てはまる

- scheduler.ts
  - 主にスケジュールによって発火させる際に使うファイル
  - cronを使って発火させる

- server.ts
  - ボットを動かす環境でHealthCheckが必要なのでそれ用兼botが落ちないようにアクセスさせるためのエンドポイント用
