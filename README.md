# SNSインサイト

Instagramの数値を取得して確認するプロトタイプです。設計の経緯は `docs/ux-5-layers.md` にまとめています。

## 起動

```sh
npm install
npm run dev
```

http://127.0.0.1:3000 を開きます。

## 公式APIへの接続

1. Metaの開発者画面でBusinessタイプのアプリを作成する
2. Instagramの「API setup with Instagram business login」でトークンを発行する
3. `.env.example` を `.env.local` にコピーし、`IG_ACCESS_TOKEN` に設定する
4. `npm run verify:instagram` で指標を取得できるか確認する
5. `npm run dev` を再起動する

トークンを設定すると、起動中は1時間ごとに自動で取得します。「今すぐ更新」でも取得できます。

## テスト

```sh
npm test
```
