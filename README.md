# Fireworks_Hand_WebAR

スマートフォンのカメラで手のひらを検出し、手のひらの上に花火エフェクトを表示するWebARサンプルです。

## 構成

- Three.js: 花火・煙・文字粒子の描画
- MediaPipe Hands: 手のひら検出
- HTML / CSS / JavaScript
- iPhone Safari / Android Chrome対応想定

## 操作

1. `開始` を押す
2. カメラを許可する
3. 手のひらをカメラに向ける
4. `花火開始` を押す
5. 表示文字を変更したい場合は入力欄を編集して `変更`
6. 音を使う場合は `音 ON`

初期文字は `祝 AR体験` です。

## 音声ファイル

以下のファイルを配置してください。

- `assets/sounds/launch.mp3`
- `assets/sounds/explosion.mp3`
- `assets/sounds/sparkle.mp3`

iPhoneでは、ユーザー操作後でないと音声再生できないため、開始ボタンと音ONボタンの操作後に再生する構造にしています。

## ローカル確認

Webカメラ利用のため、直接HTMLを開くのではなくローカルサーバーで確認します。

```bash
cd Fireworks_Hand_WebAR
python -m http.server 8000
```

PCでは以下を開きます。

```text
http://localhost:8000
```

スマートフォン実機で確認する場合は、同じWi-Fi内でPCのIPアドレスを使います。

```text
http://PCのIPアドレス:8000
```

ただし、スマホのカメラはHTTPSでないと動かない場合があります。実機確認はGitHub PagesなどHTTPS環境を推奨します。

## GitHub Pages公開

1. GitHubで新規リポジトリを作成
2. このフォルダー内のファイルをアップロード
3. GitHubのリポジトリ画面で `Settings` を開く
4. `Pages` を開く
5. Sourceを `Deploy from a branch` にする
6. Branchを `main`、フォルダーを `/root` にする
7. Save
8. 数分後に表示されるURLへアクセス

## 調整ポイント

`main.js` の `CONFIG` を変更します。

- `defaultText`: 初期表示文字
- `maxSparks`: 火花の最大粒子数
- `maxSmoke`: 煙の最大粒子数
- `palmOffsetY`: 手のひらから花火までの高さ
- `textSampleStep`: 文字粒子の密度。小さいほど高密度

## 注意

このサンプルは、スマホカメラ映像の上にThree.jsを重ねる方式です。WebXRの空間認識や実スケール固定ではなく、手のひら座標に追従する軽量WebAR表現です。
