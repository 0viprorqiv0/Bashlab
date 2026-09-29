#!/usr/bin/env node
/**
 * BashLab — Terminal Benchmark Dashboard
 * Displays high-contrast ASCII terminal charts for live demo and evaluation.
 */

const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

console.log(`
${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                      BASHLAB — BENCHMARK & STRESS TESTING REPORT                          ║
║               Host: 12th Gen Intel Core i5-12450HX (12 CPUs) | 15.3 GiB RAM               ║
║              Runner: Ubuntu 24.04 (Single Container | 512MB RAM Cap | 2 CPUs)             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝${RESET}

${BOLD}${GREEN}[1] ĐỘ TRỄ PHẢN HỒI THEO TẢI ĐỒNG THỜI (LATENCY p50 vs p95)${RESET}
${DIM}Đo thời gian thực thi (mili-giây) từ lúc nhận HTTP request đến khi hoàn tất trả stdout${RESET}

  Latency (ms)
   6,000 ┼                                                  p95 (Tail): 5,275ms
         │                                 p95: 5,236ms   ${RED}●──────────────────●${RESET}
   5,000 ┼                           ${RED}●────────────────────┘${RESET}
         │                 p95: 4,245ms
   4,000 ┼                   ${RED}●${RESET}
         │                                  p50: 3,212ms    p50: 3,445ms
   3,000 ┼                           ${CYAN}●──────────────────────●${RESET} (Median)
         │                 p50: 1,983ms
   2,000 ┼                   ${CYAN}●${RESET}
         │         p95: 1,412ms
   1,000 ┼           ${RED}●${RESET}
         │         p50: 1,010ms
     0ms ┼─────────${CYAN}●${RESET}─────────────────────────────────────────────────────────────
         │        10 conn           20 conn           30 conn          50 conn
         └───────────┴─────────────────┴─────────────────┴────────────────┴───────────►

  ${BOLD}Ghi chú kỹ thuật:${RESET}
  - ${CYAN}p50 (Trung vị):${RESET} 50% người dùng nhận kết quả trong 1.0s – 1.9s ở mức tải 10–20 conn.
  - ${RED}p95 (Đuôi phân vị):${RESET} Chặn trần ở mức ~5.2s do cơ chế Timeout Watchdog 5.0s ngắt an toàn.


${BOLD}${GREEN}[2] TIÊU THỤ BỘ NHỚ RAM: BASHLAB vs MÔ HÌNH 1 DOCKER / USER (ĐIỂM ĐẮT GIÁ NHẤT)${RESET}
${DIM}Chứng minh kiến trúc 1 Docker Runner + Bwrap loại bỏ hoàn toàn tình trạng OOM${RESET}

  RAM (MiB)
   3,000 ┼
         │                                                     ${RED}[2,500 MiB]${RESET}
   2,000 ┼                                                     ${RED}█ Docker cũ${RESET}
         │                                   ${RED}[1,500 MiB]${RESET}       ${RED}█${RESET}
   1,000 ┼                     ${RED}[1,000 MiB]${RESET}   ${RED}█ Docker cũ${RESET}       ${RED}█${RESET}
         │       ${RED}[500 MiB]${RESET}     ${RED}█ Docker cũ${RESET}   ${RED}█${RESET}                 ${RED}█${RESET}
     500 ┼       ${RED}█ Docker cũ${RESET}   ${RED}█${RESET}             ${RED}█${RESET}                 ${RED}█${RESET}
         │       ${RED}█${RESET}             ${RED}█${RESET}             ${RED}█${RESET}                 ${RED}█${RESET}
       0 ┼───────┴─────────────┴─────────────┴─────────────────┴─────────────────────►
               10 Users        20 Users        30 Users          50 Users

  ${BOLD}${GREEN}BashLab:       15.7 MiB        13.5 MiB        10.2 MiB          13.7 MiB  (ĐƯỜNG NẰM PHẲNG!)${RESET}

  ${BOLD}Luận điểm bảo vệ cốt lõi:${RESET}
  ${YELLOW}➔ Khi tải tăng gấp 5 lần (10 -> 50 users), RAM của BashLab Runner chỉ duy trì phẳng lì${RESET}
  ${YELLOW}  ở mức 10–16 MiB nhờ: (1) Bubblewrap không sinh container mới, (2) /tmp nằm trên SSD.${RESET}


${BOLD}${GREEN}[3] CƠ CHẾ ĐIỀU TIẾT QUÁ TẢI & CIRCUIT BREAKER (ADMISSION CONTROL)${RESET}
${DIM}Hệ thống tự động kích hoạt bảo vệ để máy chủ không bao giờ bị crash hoặc đơ${RESET}

  Tải đồng thời:
  10 Conn  [${GREEN}████████████████████████████████████████${RESET}] 100.0% Hoàn thành (100 / 100)
  20 Conn  [${GREEN}████████████████████████████████████████${RESET}] 100.0% Hoàn thành (200 / 200)
  30 Conn  [${CYAN}████████████████████████████████${RESET}░░░░░░░░]  90.7% (272 OK, 28 Timeout 5s)
  50 Conn  [${YELLOW}████████████████${RESET}░░░░░░░░░░░░░░░░░░░░░░░░]  41.6% (208 OK, 152 Timeout, 140 Reject 429)

┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬──────────────────────────────┐
│ Tải Concurr │ Hoàn thành  │ Timeout 5s  │ 429 Reject  │ Runner RAM  │ Trạng thái bảo vệ máy chủ    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼──────────────────────────────┤
│ 10 conn     │ 100 / 100   │ 0           │ 0           │ 15.7 MiB    │ ${GREEN}✅ Ổn định tuyệt đối${RESET}         │
│ 20 conn     │ 200 / 200   │ 0           │ 0           │ 13.5 MiB    │ ${GREEN}✅ Hàng đợi mượt mà${RESET}          │
│ 30 conn     │ 272 / 300   │ 28 (9.3%)   │ 0           │ 10.2 MiB    │ ${CYAN}⚠️ Ngắt lệnh trễ quá 5s${RESET}       │
│ 50 conn     │ 208 / 500   │ 152 (30.4%) │ 140 (28.0%) │ 13.7 MiB    │ ${YELLOW}🛡️ Circuit Breaker từ chối 429${RESET} │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴──────────────────────────────┘

${BOLD}${CYAN}KẾT LUẬN TỔNG QUAN BẢO VỆ TRƯỚC HỘI ĐỒNG:${RESET}
  1. ${BOLD}Không bao giờ sập:${RESET} Hệ thống không xảy ra bất kỳ lỗi Crash, Kernel Panic hay OOM nào.
  2. ${BOLD}Tiết kiệm tài nguyên tuyệt đối:${RESET} Tiết kiệm hơn 99% RAM so với giải pháp truyền thống.
  3. ${BOLD}Chịu tải thông minh:${RESET} Quá tải thì kích hoạt hàng đợi và từ chối an toàn bằng HTTP 429.
`);
