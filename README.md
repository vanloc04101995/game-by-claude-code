# Dotline

Puzzle nối chấm cùng màu, lấp đầy bảng, không cắt nhau — tối ưu cho điện thoại, chơi một tay.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server (mở được từ điện thoại cùng mạng Wi-Fi qua địa chỉ "Network") |
| `npm test` | Chạy unit test (solver, bộ sinh màn, logic chơi) |
| `npm run levels [seed]` | Sinh lại `src/levels/packs.json` |
| `npm run build` | Type-check + build bản production vào `dist/` |

## Cấu trúc

```
src/core/     Lõi thuần TypeScript: rng, grid, solver, generator, codec, palette
src/game/     Trạng thái màn chơi (game.ts), vẽ canvas (renderer.ts), âm thanh/rung (feedback.ts)
src/app/      Màn hình, router, lưu tiến độ, daily, cài đặt
scripts/      Pipeline sinh màn offline
docs/PLAN.md  Kế hoạch và tiến độ
```
