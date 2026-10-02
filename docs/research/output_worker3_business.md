[34m🌐 [Search] B2B edtech cohort dashboard team progress tracking enterprise learning analytics, edtech SaaS retention metrics DAU WAU MAU cohort retention curve dashboard, interactive lab platform compute resource cost per user sandbox cost, subscription edtech conversion churn LTV metrics dashboard...[0m
[2m💭 Searched 18 websites[0m
[2m⏱ Worked for a few seconds[0m
# Báo cáo nghiên cứu: Business / Enterprise / Cohort & Platform Operations Dashboard cho BashLab

## 0. Tổng quan chiến lược

Đối với BashLab (nền tảng học Linux/Bash trực tiếp qua browser terminal + sandbox container), dashboard dành cho **Business Admin / Organization Manager / Founder** không nên chỉ là "Learning Analytics".

Nó cần kết hợp 4 lớp dữ liệu:

```
                    BUSINESS COMMAND CENTER

┌─────────────────────────────────────────────┐
│ 1. Customer / Organization Health           │
│    - Doanh nghiệp nào đang dùng tốt?        │
│    - Team nào có nguy cơ churn?             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 2. Learning Impact Analytics                │
│    - Cohort progress                        │
│    - Skill development                      │
│    - Completion / mastery                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 3. SaaS Revenue Intelligence                │
│    - MRR / ARR                              │
│    - Conversion                            │
│    - Churn                                │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 4. Infrastructure Economics                 │
│    - Sandbox cost                           │
│    - CPU/RAM efficiency                     │
│    - Cost per learner                       │
└─────────────────────────────────────────────┘
```

Các nền tảng SaaS hiện đại thường kết hợp product analytics (Amplitude/Mixpanel model), subscription analytics và cohort analytics thay vì chỉ LMS analytics. Các dashboard retention chuẩn thường có:

- Weekly cohort retention heatmap
- DAU / WAU / MAU
- Activation funnel
- Feature adoption
- Growth accounting

citeturn0search1

---

# 1. Benchmark các mô hình thực tế

## 1.1 Enterprise Learning Dashboard

Các nền tảng B2B learning như:

- entity["company","A Cloud Guru","enterprise cloud training platform"]
- entity["company","Hack The Box","cybersecurity training platform"]
- entity["company","Codecademy","online coding education platform"]

thường có mô hình:

```
Organization
      |
      |
      +-- Teams
            |
            +-- Learners
                    |
                    +-- Courses
                    +-- Labs
                    +-- Skills
```

Manager không quan tâm:

> "User đã click bao nhiêu lần"

mà quan tâm:

> "Team này sau 3 tháng có đủ kỹ năng Linux không?"

---

## 1.2 Product Analytics Model

Các công cụ như Mixpanel / Amplitude dùng:

```
User Event Stream

signup
login
start_lab
execute_command
complete_lab
earn_badge
upgrade_plan
cancel_subscription
```

Sau đó tạo:

```
User
 |
 +-- Activation
 |
 +-- Engagement
 |
 +-- Retention
 |
 +-- Revenue
```

citeturn0search1

---

# 2. Kiến trúc tổng thể Dashboard BashLab

## Main Business Dashboard Layout

```
┌─────────────────────────────────────────────┐
│ BashLab Business Overview                   │
├─────────────────────────────────────────────┤
│                                             │
│ Active Org     MRR        Sandbox Cost      │
│ 128            $18K       $1.2K             │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ User Growth              Retention          │
│ ┌─────────────┐          ┌─────────────┐    │
│ │ DAU/WAU/MAU │          │ Cohort Heat  │    │
│ └─────────────┘          └─────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Organizations Health                        │
│                                             │
│ Enterprise A       82% completion            │
│ Enterprise B       44% inactive risk         │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Infrastructure Economics                    │
│                                             │
│ Cost/User   CPU Util   Idle Sandbox         │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 3. Dashboard 1 — Organization / Cohort Management

# Mục tiêu

Dành cho:

- Company admin
- University admin
- Instructor
- Training manager


## Widget bắt buộc


## 3.1 Team Progress Overview Card


```
Team Progress

Acme Security Team

Members:
54

Labs assigned:
25

Completed:
72%

Average Skill:
Linux Intermediate

Inactive:
6 users
```


### Metrics

| Metric | Formula |
|-|-|
| Completion Rate | completed labs / assigned labs |
| Active Learner Rate | active users / total users |
| Avg Lab Time | total learning minutes / completed labs |
| Skill Score | weighted skill points |


---

# 3.2 Cohort Skill Matrix

Visualization:

## Heatmap

```
             Linux Bash Networking Security

Alice        ████  ███  ██       ███

Bob          ██    ████ ███      █

Carol        ████  ██   ████     ████

```

Màu:

- đỏ: weak
- vàng: developing
- xanh: mastered


Data:

```json
{
 "cohort":"Cyber Team 2026",
 "skills":[
   {
    "name":"Linux Shell",
    "average":82,
    "members":40
   }
 ]
}
```

---

# 3.3 Learner Risk Table

Quan trọng nhất cho B2B.


```
At Risk Learners

User       Last Active   Progress   Risk

John       14 days ago   21%        HIGH

Anna       8 days ago    40%        MEDIUM

Mike       2 days ago    80%        LOW
```


Rule:

```
inactive_days > 7
AND
completion < cohort_average
=
risk
```

---

# 4. Dashboard 2 — Engagement & Retention Analytics


## 4.1 DAU / WAU / MAU


Visualization:

Line chart


```
Users

1000 |
800  |          MAU
600  |      WAU
400  |
200  | DAU
     ----------------
       Jan Feb Mar
```


Metrics:


### DAU

```
COUNT(unique users active today)
```


### WAU

```
COUNT(unique users last 7 days)
```


### MAU

```
COUNT(unique users last 30 days)
```


### Stickiness


```
DAU / MAU
```

---

## 4.2 Cohort Retention Matrix

Đây là dashboard quan trọng nhất.


Visualization:

Heatmap:


```
Signup Month

        W0 W1 W2 W3 W4

Jan     100 70 60 55 48

Feb     100 75 65 50

Mar     100 80 70

```


Metrics:

```
Retention(n)

=
users active after n weeks
/
users at cohort start
```


Cohort retention heatmap là pattern phổ biến trong product analytics. citeturn0search0turn0search1


---

## 4.3 Learning Session Analytics


Chart:


```
Average Session Duration

30m |
20m |       ███
10m | ███
     ----------------
       Week1 Week2
```


Metrics:

```
Average Learning Time

=
total session duration
/
active learners
```


---

# 5. Dashboard 3 — SaaS Revenue Dashboard

Founder/Product Owner.


## Layout


```
Revenue Command Center

MRR          ARR          Churn

$25K         $300K        3.2%


        Revenue Movement

New     Expansion     Lost

███       ██           █


        Subscription Funnel


Free
 |
Trial
 |
Paid
 |
Renewed

```


---

# 5.1 Subscription Funnel


Visualization:

Funnel:


```
10000 Visitors

 ↓

3000 Signup

 ↓

1200 Trial

 ↓

300 Paid

 ↓

240 Renew
```


Metrics:


Trial conversion:


```
paid users / trial users
```


---

# 5.2 MRR Waterfall


Visualization:

```
MRR


Starting MRR

 + New customers

 + Expansion

 - Downgrade

 - Churn


Ending MRR

```


Formula:


```
Ending MRR

=
Starting MRR
+
New MRR
+
Expansion MRR
-
Churn MRR
```


Các SaaS dashboard chuẩn thường phân rã MRR thành New / Expansion / Contraction / Churn. citeturn0search10

---

# 5.3 Customer Retention


Metrics:


## Logo Churn

```
lost customers
/
customers beginning period
```


## Revenue Churn


```
lost MRR
/
starting MRR
```


## LTV


```
ARPA × Gross Margin
-------------------
Monthly Churn
```


Các dashboard subscription thường theo dõi MRR, ARR, churn, LTV, renewal. citeturn0search5turn0search6

---

# 6. Dashboard 4 — Sandbox Infrastructure Economics

Đây là phần BashLab khác biệt so với LMS.


Vì mỗi learner có:

```
Browser

 |
API

 |
Sandbox Manager

 |
Docker Container

 |
CPU/RAM/Disk
```


---

# 6.1 Compute Cost Overview


Card:


```
Sandbox Economics


Active Containers

340


Monthly Cost

$850


Cost / Learner

$2.5


Idle Containers

43
```


---

# 6.2 Cost Per User


Bar chart:


```
Cost/user


Enterprise A
████████ $5


Enterprise B
████ $2


Enterprise C
██ $1
```


Formula:


```
Cost per learner

=
Cloud compute cost
/
active learners
```


---

# 6.3 Sandbox Efficiency


Metrics:


## Container Utilization


```
used CPU
---------
allocated CPU
```


## Idle Recovery Rate


```
destroyed idle sandbox
/
idle sandbox detected
```


## Cost per Completed Lab


```
sandbox cost
--------------
completed labs
```


---

# 7. Business Dashboard Data Model


## Organization


```json
{
 "organization_id":"org_001",
 "name":"ABC Security",
 "plan":"enterprise",
 "users":120,
 "created_at":"2026-01-01"
}
```


---

## User


```json
{
"user_id":"u100",
"organization_id":"org001",
"role":"learner",

"created_at":
"2026-01-10",

"last_active":
"2026-09-20"
}
```


---

## Learning Event


```json
{
"user_id":"u100",

"event":
"complete_lab",

"lab_id":"bash_03",

"timestamp":
"2026-09-20"
}
```


---

## Skill Progress


```json
{
"user_id":"u100",

"skills":[

 {
"name":"Linux",
"score":85
 },

 {
"name":"Bash",
"score":72
 }

]
}
```


---

## Subscription


```json
{
"organization_id":"org001",

"plan":"enterprise",

"mrr":1200,

"start_date":
"2026-01-01",

"renewal_date":
"2027-01-01"
}
```


---

## Sandbox Usage


```json
{
"container_id":"sbx001",

"user_id":"u100",

"cpu_hours":15,

"memory_gb_hours":30,

"cost":2.4,

"destroyed":true
}
```

---

# 8. Đề xuất UI cuối cùng cho BashLab


## Founder View

```
Business Health

├── Revenue
│   ├── MRR
│   ├── ARR
│   ├── Churn
│
├── Growth
│   ├── DAU/MAU
│   ├── Retention
│
├── Cost
│   ├── Sandbox Cost
│   ├── Cost/User
│
└── Organizations
    ├── Active companies
    └── Expansion opportunities
```


---

## Company Admin View


```
My Organization


├── Team Progress

├── Skill Matrix

├── Completion

├── Risk Learners

└── Reports
```


---

# 9. Ưu tiên triển khai cho BashLab (MVP → Advanced)


## Phase 1 (bắt buộc)

✅ Organization overview  
✅ Team progress  
✅ DAU/WAU/MAU  
✅ Cohort retention  
✅ Sandbox cost/user  


## Phase 2

✅ Skill matrix  
✅ Risk prediction  
✅ Subscription analytics  


## Phase 3

✅ Predictive churn model  
✅ Cost optimization AI  
✅ Training ROI analytics  


---

# Kết luận kiến trúc

Dashboard Business của BashLab nên không xây theo kiểu LMS truyền thống.

Mô hình phù hợp nhất:

```
BashLab Business Intelligence

       Learning Analytics
              +
       Product Analytics
              +
       SaaS Metrics
              +
       Cloud Economics


= Enterprise Training Operating System
```

Bốn dashboard lõi cần có:

1. **Organization & Cohort Health Dashboard**  
→ quản lý doanh nghiệp/trường học

2. **Engagement & Retention Dashboard**  
→ hiểu người học có thực sự quay lại

3. **Revenue & Subscription Dashboard**  
→ vận hành SaaS business

4. **Sandbox Cost & Infrastructure Dashboard**  
→ kiểm soát lợi nhuận trên nền tảng terminal thực hành

Đây là cấu trúc gần nhất với mô hình của các nền tảng B2B EdTech + SaaS Product Analytics hiện đại.

