// ビルド先の仕様で必要なので8080ポートで起動する
import * as http from "http";

export const server = http.createServer((req, res) => {
  // CORSヘッダーの設定
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/") {
    res.statusCode = 200;
    res.end(JSON.stringify({ message: "Server is Online." }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});
