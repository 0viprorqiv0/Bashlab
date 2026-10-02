# BashLab System Optimization Plan

## 1. Audit summary

Mục tiêu: giữ BashLab là một web app thực hành Bash đơn giản, giảm trạng thái dư thừa, tránh over-engineering, nhưng đảm bảo lifecycle sandbox rõ ràng.

Các file đã kiểm tra:

- `backend/src/server.js`
- `backend/src/services/sessionManager.js`
- `backend/src/services/reaperService.js`
- `frontend/components/workspace/LabWorkspace.jsx`
- `frontend/lib/sandbox.js` (không tồn tại `sandboxClient.js`, frontend hiện dùng file này)

## 2. Kiến trúc hiện tại

### Backend

Hiện tại backend có các thành phần:

```
API routes
   |
   v
server.js
   |
   +-- SessionManager
   |      +-- create()
   |      +-- execute lock
   |      +-- reset()
   |      +-- remove()
   |
   +-- SandboxRunner
   |
   +-- Reaper
          +-- idle cleanup
```

Session hiện chỉ lưu trong memory:

```js
Map<sessionId, session>
```

Session chứa:

- workspacePath
- cwd
- lastActiveAt
- commandCount
- busy
- quarantined

### Frontend

`LabWorkspace.jsx` hiện có lifecycle:

```
Mount component
       |
       v
useEffect()
       |
       v
handleStartInstance()
       |
       v
POST /api/sessions
```

=> Đây là nguyên nhân session tự khởi tạo khi người dùng chỉ mở lab.

---

# 3. Các vấn đề chính

## P1. Session lifecycle chưa đúng với mô hình 1 learner - 1 sandbox

### Hiện trạng

Backend cho phép:

```js
maxSessionsPerUser = 3
```

Trong khi yêu cầu:

```
1 learner
   |
   +-- tối đa 1 active sandbox session
```

Ngoài ra frontend tạo session mới mỗi lần mount.

Ví dụ:

```
Lab 1
 reload
   |
   +-- tạo session mới

Lab 1
 Start
   |
   +-- tạo session mới
```

Không idempotent.

---

## P2. Session chưa gắn rõ với lesson

Hiện tại practice record có lessonId:

```js
openPracticeRecord(userId, lessonId, session.id)
```

nhưng SessionManager không biết:

```
session -> lesson
```

Do đó backend không thể quyết định:

```
User A
 Lab 1 session exists

User opens Lab 2
 => stop Lab1
 => clean workspace
 => create Lab2
```

---

## P3. Reaper chưa xử lý đúng quarantined

Code hiện tại:

```js
if (session.busy || session.quarantined || now - session.lastActiveAt <= ttlMs) continue;
```

Nghĩa là:

```
quarantined session
        |
        X
        không bao giờ cleanup
```

Đi ngược yêu cầu:

> quarantined cũng phải được dọn sạch workspace về 0.

---

## P4. Frontend đang tự đóng session khi rời trang

Hiện tại:

```js
return () => { if (sessionIdRef.current) endSession(sessionIdRef.current); }
```

Điều này gây mất session khi:

- reload browser
- chuyển route
- refresh accidental

Nhưng yêu cầu:

```
reload Lab 1
=> giữ session cũ
```

---

# 4. Kiến trúc đề xuất

## Nguyên tắc

Không thêm database session, queue, event bus hoặc abstraction mới.

Giữ:

```
Express
  |
SessionManager
  |
SandboxRunner
```

Chỉ bổ sung lifecycle state cần thiết.

---

# 5. Backend changes

## 5.1 SessionManager đổi model session

Session mới:

```js
{
 id,
 userId,
 lessonId,
 workspacePath,
 cwd,
 lastActiveAt,
 status: 'active' | 'stopping',
 quarantined
}
```

---

## 5.2 Thêm getActiveUserSession()

Thay vì:

```
create()
```

frontend gọi:

```
startSession(userId, lessonId)
```

Logic:

```
startSession(user, lesson)

        |
        v

Có session active?

       / \
     no   yes
     |      |
 create   lesson giống nhau?
            |
          /   \
        yes    no
        |       |
 return    remove old
 old       create new
```

---

## 5.3 Session cùng lesson phải idempotent

Ví dụ:

```
User
 Lab 1
 Start

session abc

Reload
 Start

return abc
```

Không reset.

Không tạo container mới.

Không mất workspace.

---

## 5.4 Chuyển lab phải cleanup trước

Flow:

```
Start Lab 2

      |
      v
Find current session

      |
      v
Different lesson?

      |
      v
manager.remove(old)

      |
      v
workspace deleted

      |
      v
create Lab2 session
```

---

# 6. Reaper redesign

## Current

```
expired
 |
 +-- normal session cleanup

quarantine
 |
 +-- ignore
```

## New

```
expired session
        |
        +-- busy?
        |       |
        |       +-- skip temporarily
        |
        +-- otherwise
                |
                +-- remove container
                +-- delete workspace
                +-- remove memory entry
```

Quarantine chỉ ảnh hưởng execute.

Không ảnh hưởng cleanup.

---

# 7. Frontend changes

## Remove auto start

Xóa:

```js
useEffect(() => {
  handleStartInstance();
}, [])
```

Thay bằng:

```
Page load
    |
    v
status = stopped
    |
    v
User click Start Instance
    |
    v
create/reuse session
```

---

## Không gọi endSession khi unmount

Bỏ:

```js
endSession(sessionId)
```

vì reload không đồng nghĩa kết thúc session.

Session lifetime do backend + reaper quản lý.

---

# 8. API đề xuất

## POST /api/sessions/start

Request:

```json
{
 "lessonId":"uuid"
}
```

Response:

```json
{
 "sessionId":"...",
 "reused":true,
 "cwd":"/home/student"
}
```

---

## DELETE /api/sessions/:id

Chỉ dùng cho:

- user bấm Stop Instance
- admin force stop

Không dùng cho navigation.

---

# 9. Migration order

## Phase 1 - Fix frontend lifecycle

1. Remove auto start effect.
2. Remove unmount cleanup.
3. Start button becomes only trigger.

Risk: thấp.

---

## Phase 2 - Backend session ownership

1. Add userId + lessonId.
2. Add lookup active session.
3. Change create -> startSession.

Risk: trung bình.

---

## Phase 3 - Cleanup correctness

1. Fix reaper quarantined handling.
2. Add tests for expired sessions.
3. Verify workspace deletion.

Risk: thấp.

---

# 10. Verification plan

## Case 1: Same lab reload

Expected:

```
Start Lab1
session=A

Reload
Start Lab1
session=A
workspace preserved
```

---

## Case 2: Change lab

Expected:

```
Lab1 session=A

Start Lab2

A removed
workspace A deleted
session=B created
```

---

## Case 3: Idle cleanup

Set:

```
lastActiveAt = now - 31min
```

Run reaper.

Expected:

```
workspace deleted
session removed
```

---

## Case 4: Quarantined cleanup

Create:

```
quarantined=true
lastActiveAt expired
```

Expected:

```
removed
```

---

# Final recommendation

Giữ kiến trúc hiện tại, chỉ sửa lifecycle.

Không cần:

- Redis
- background queue
- database session table
- websocket state manager
- container orchestration layer

Mô hình tối ưu cho BashLab:

```
Frontend
  |
 Start Instance button
  |
Backend
  |
 SessionManager
  |
 one learner = one session
  |
Reaper
  |
 workspace cleanup
```

Đây là thiết kế nhỏ nhất đáp ứng đầy đủ yêu cầu: idempotent, tiết kiệm RAM/Disk, dễ debug và phù hợp với một web app học Bash.