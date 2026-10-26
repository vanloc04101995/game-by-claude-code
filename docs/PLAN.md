# Dotline — kế hoạch triển khai

Tên "Dotline" là tên tạm. Nền tảng: web/PWA (TypeScript + Vite, không framework UI),
đóng gói lên iOS/Android bằng Capacitor ở giai đoạn 2.

## Giai đoạn 0 — Prototype chơi được ✅ (26/10/2026)

- [x] Lõi: RNG có seed, bộ sinh màn (ghép đường + kiểm tra nghiệm duy nhất), solver, chấm độ khó
- [x] Solver được đối chiếu với bộ giải brute-force (0 sai lệch trên 16.000 bàn nhỏ)
- [x] Pipeline offline: `npm run levels` → 150 màn, 5 pack, độ khó tăng dần trong mỗi pack
- [x] Gameplay: kéo vẽ, kéo lùi để xóa, cắt đường màu khác và tự mọc lại khi lùi, hoàn tác, chơi lại, gợi ý
- [x] Âm thanh tổng hợp (thang ngũ cung) + rung; hiệu ứng thắng dạng sóng
- [x] Màn 1 hướng dẫn bằng ngón tay ảo, không chữ
- [x] Daily: sinh trên máy theo ngày, chuỗi ngày, thẻ chia sẻ kiểu Wordle, đếm ngược
- [x] Chọn màn theo pack, sao, mở khóa tuần tự; cài đặt (âm thanh, rung, mù màu, sáng/tối)
- [x] PWA: manifest + service worker (chơi offline sau lần mở đầu)

## Giai đoạn 1 — MVP để soft launch (6–8 tuần)

- [ ] Playtest với 10–20 người, đo thời gian giải từng màn → hiệu chỉnh lại thứ tự độ khó
- [ ] Analytics sự kiện (level_start / level_complete / hint_used / daily_complete / share)
- [ ] Mở rộng lên ~500 màn; thêm pack lưới chữ nhật dọc 9×11, 9×12
- [ ] Màn "nghỉ" xen kẽ (đường cong răng cưa) thay vì tăng đều
- [ ] Icon PNG cho iOS/Android, splash screen
- [ ] Đóng gói Capacitor → TestFlight / Google Play internal testing
- [ ] Rewarded ads để nhận gợi ý; IAP "Xóa quảng cáo"
- [ ] Haptics native qua Capacitor (iOS không hỗ trợ `navigator.vibrate`)

## Giai đoạn 2 — Soft launch (VN/PH, 4 tuần)

- Cổng qua: FTUE ≥ 90%, D1 ≥ 40%, D7 ≥ 15%
- Thách đấu bạn bè bằng link chứa seed; leaderboard daily

## Giai đoạn 3 — Mở rộng

- Cơ chế mới theo pack: Tường → Cầu → Ô bắt buộc → Warp → Một chiều
- Theme / bảng màu sưu tầm; sự kiện tuần; đồng bộ tiến độ đám mây

## Ghi chú kỹ thuật

- Luật "không tự chạm" chỉ dùng khi **sinh hình dạng** đường; tính duy nhất được kiểm tra
  theo **luật thật** của game (người chơi được phép vẽ đường sát chính nó).
- Độ khó = số nút solver phải duyệt để chứng minh nghiệm duy nhất. Cần hiệu chỉnh bằng dữ liệu thật.
- Daily phụ thuộc vào mã nguồn bộ sinh: đổi `generator.ts`/`solver.ts` sẽ đổi đề daily của các ngày tương lai.
