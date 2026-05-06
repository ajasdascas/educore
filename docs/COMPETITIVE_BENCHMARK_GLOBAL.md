# EduCore — Competitive Benchmark Global
**Scope:** LATAM small/medium private schools (50–500 students)  
**Focus:** Grading, attendance, parent comms, billing, reports  
**Last updated:** 2026-05-05

---

## 1. Competitor Profiles

---

### 1.1 Classcraft
| Dimension | Detail |
|-----------|--------|
| **Target market** | USA/Canada/International; middle school and high school; 20–2,000+ students |
| **Primary use** | Gamified classroom engagement and behavior management |
| **Pricing** | Free tier; school plans ~$120/teacher/yr; district contracts custom |
| **Languages** | English, French, Spanish (limited) |

**Core features:**
- Behavior points and rewards (gamification)
- Basic parent notifications
- Classroom quests / assignments
- Google Classroom integration
- No built-in billing, minimal attendance

**Strengths:**
- Unique gamification hook for student engagement
- Strong teacher UX
- Widely adopted in North America

**Weaknesses:**
- Not a school-management SaaS — no billing, no report cards, no enrollment
- Spanish localization is secondary, no LATAM focus
- No multi-tenant admin console
- No grades/report card module

**EduCore opportunity:** Full SaaS stack (billing + grades + attendance + parent portal) vs. single-feature engagement tool. EduCore can offer everything Classcraft ignores.

---

### 1.2 Google Classroom
| Dimension | Detail |
|-----------|--------|
| **Target market** | Global; all school sizes and levels; deeply penetrated LATAM public sector |
| **Primary use** | LMS / assignment distribution |
| **Pricing** | Free (Workspace for Education Fundamentals); paid tiers $3–$5/student/yr for advanced |
| **Languages** | 60+ languages including Spanish |

**Core features:**
- Assignments, grading rubrics, feedback
- Google Meet integration
- Stream announcements
- Guardian email summaries (limited parent portal)
- NO billing, no enrollment, no attendance module, no report cards (SEP-style)

**Strengths:**
- Zero cost for basic tier
- Deep Google ecosystem (Drive, Docs, Meet)
- Extremely low friction — no IT admin needed
- Massive market penetration

**Weaknesses:**
- Not administrative — no enrollment, no fees, no attendance register, no official report cards
- Guardian summaries are primitive vs. a real parent portal
- No multi-tenant school management
- Privacy concerns in some LATAM districts

**EduCore opportunity:** EduCore is the administrative backbone; Google Classroom can integrate as an LMS layer. EduCore fills the vacuum Google doesn't touch: payments, boletas, enrollment, tenant isolation.

---

### 1.3 PowerSchool
| Dimension | Detail |
|-----------|--------|
| **Target market** | USA/Canada public K–12 districts; 1,000–50,000+ students |
| **Primary use** | Student information system (SIS) + LMS |
| **Pricing** | $10–$40/student/yr, district contracts; no public LATAM pricing |
| **Languages** | English primary; limited Spanish |

**Core features:**
- Full SIS (enrollment, demographics, transcripts)
- Gradebook and standards-based grading
- Attendance tracking
- Parent/student portal
- Analytics and state reporting
- Billing via integrations (not native)

**Strengths:**
- Gold standard SIS in North America
- Extremely deep feature set
- Strong compliance tooling (FERPA, ADA)

**Weaknesses:**
- Enormous complexity — requires IT staff and 3–6 month onboarding
- Pricing inaccessible for LATAM private SMBs
- No native billing for school fees (tuition, inscripciones)
- Spanish UX is an afterthought
- No LATAM tax / fiscal data support (RFC, CFDI)
- Cloud version still feels like on-premise software

**EduCore opportunity:** PowerSchool at 1/10th the complexity and cost, built for LATAM billing workflows (Stripe MXN, OXXO), Spanish-first, with fiscal data (RFC, razón social) native.

---

### 1.4 Blackboard (Anthology)
| Dimension | Detail |
|-----------|--------|
| **Target market** | Higher education and large K–12 districts; global including LATAM universities |
| **Primary use** | LMS |
| **Pricing** | Enterprise contracts; $50,000+/yr for institutions |
| **Languages** | Spanish supported |

**Core features:**
- LMS with courses, graded discussions, tests
- Mobile app
- Analytics on course completion
- Institutional integrations (ERP, SIS)
- NOT a billing or enrollment tool

**Strengths:**
- Mature product, 30+ years in market
- Strong in LATAM higher ed (Mexico, Colombia, Brazil)
- Full content management

**Weaknesses:**
- Extremely expensive, enterprise only
- LMS focus — no operational school management
- No parent portal for K–12
- Legacy UX, heavy to configure
- No SaaS multi-tenant for small private schools

**EduCore opportunity:** Completely different segment. EduCore targets K–12 private schools (50–500 students) where Blackboard has no viable offer. Zero overlap in ideal customer profile.

---

### 1.5 Infinite Campus
| Dimension | Detail |
|-----------|--------|
| **Target market** | USA public K–12 districts; medium to large |
| **Primary use** | SIS + parent/student portal |
| **Pricing** | District licensing; $5–$15/student/yr |
| **Languages** | English; Spanish via translation tools |

**Core features:**
- Full SIS (enrollment, scheduling, demographics)
- Gradebook
- Attendance
- Parent and student portals (mobile apps)
- Food service, health records, transportation
- Analytics dashboard

**Strengths:**
- Very comprehensive district-level tooling
- Strong parent mobile experience
- Good data analytics

**Weaknesses:**
- USA-only focus; no LATAM presence or support
- No billing for tuition/fees (school fundraising, not operational)
- Overkill for small private schools
- No CFDI/fiscal data
- No SaaS model for SMB schools

**EduCore opportunity:** Same gap as PowerSchool — EduCore is LATAM-native, SMB-sized, with native billing and fiscal data from day one.

---

### 1.6 Brightwheel
| Dimension | Detail |
|-----------|--------|
| **Target market** | USA/Canada; early education (daycare, preschool, kindergarten); 10–200 students |
| **Primary use** | Childcare management + parent communication |
| **Pricing** | Free (basic); $150–$1,200/yr per classroom; billing add-on separate |
| **Languages** | English; limited Spanish |

**Core features:**
- Daily activity logs (meals, naps, diaper changes, mood)
- Photos and updates to parents (real-time)
- Check-in/check-out with QR codes
- Tuition billing and payment processing
- Incident reports and health checks
- Milestone tracking

**Strengths:**
- Best-in-class for early childhood UX
- Real-time parent communication
- Native billing with ACH/card
- Very easy to use for non-technical staff

**Weaknesses:**
- Not academic: no gradebooks, no academic report cards, no schedules
- USA-only billing rails
- Limited to daycare/preschool use case
- No multi-level school support (can't add primaria)
- No LATAM pricing

**EduCore opportunity:** EduCore already has `daily_logs`, `meals`, `naps`, `diapers`, `mood` in the modules catalog for babies/daycare level. If those modules are fully implemented, EduCore can compete directly in Mexican kinder/guardería market where Brightwheel has no footprint.

---

### 1.7 Kindertales
| Dimension | Detail |
|-----------|--------|
| **Target market** | USA/Canada; daycare and preschool centers; 15–150 children |
| **Primary use** | Childcare management SaaS |
| **Pricing** | ~$99–$299/month per center |
| **Languages** | English only |

**Core features:**
- Child check-in/out
- Daily reports to parents
- Staff scheduling
- Invoicing and billing
- Development milestone tracking
- Ratio compliance alerts (staff-to-child regulations)

**Strengths:**
- Strong billing and invoicing
- Ratio/compliance alerts are unique
- Canadian/USA regulatory compliance

**Weaknesses:**
- English only — no LATAM presence
- Not academic — no grades, no report cards, no subject management
- No multi-level school support
- Compliance features irrelevant to Mexican regulatory environment

**EduCore opportunity:** Clean whitespace in LATAM early-childhood market. No Spanish-language competitor at this tier.

---

### 1.8 Seesaw
| Dimension | Detail |
|-----------|--------|
| **Target market** | Global; K–8; classroom portfolios and parent communication |
| **Primary use** | Digital portfolio + parent engagement platform |
| **Pricing** | Free (basic); $120/teacher/yr for school plan |
| **Languages** | 40+ languages including Spanish |

**Core features:**
- Student digital portfolios (photos, videos, work samples)
- Parent/family messaging
- Teacher lesson activity library
- Basic assignment feedback
- NO billing, NO grading system, NO attendance, NO report cards

**Strengths:**
- Excellent parent-teacher communication
- Very popular in K–5 LATAM private schools (Mexico City, Colombia)
- Multilingual and easy to use
- Students create, not just consume

**Weaknesses:**
- Pure portfolio/comms tool — not an SIS
- No gradebook, no attendance, no enrollment, no billing
- Can't replace administrative back-office
- Subscription per teacher, not per school

**EduCore opportunity:** Seesaw is a teacher/parent comms layer. EduCore is the school's operational backbone. They can coexist, but EduCore's communications module and parent portal replaces Seesaw for schools wanting one platform.

---

## 2. Feature Gap Matrix

**Legend:** ✅ Available and functional | ⬜ Not available | partial = partial/limited

| Feature | Classcraft | Google Classroom | PowerSchool | Blackboard | Infinite Campus | Brightwheel | Kindertales | Seesaw | **EduCore** |
|---------|-----------|-----------------|------------|-----------|----------------|------------|------------|-------|------------|
| **Multi-tenant SaaS** | ⬜ | ⬜ | partial | partial | partial | ✅ | ✅ | partial | ✅ |
| **Spanish-first UI** | partial | partial | partial | partial | partial | ⬜ | ⬜ | partial | ✅ |
| **LATAM billing (MXN/Stripe)** | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| **RFC / CFDI fiscal data** | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | partial (schema only) |
| **Student enrollment / SIS** | ⬜ | ⬜ | ✅ | ⬜ | ✅ | partial | partial | ⬜ | ✅ |
| **Gradebook** | partial | partial | ✅ | ✅ | ✅ | ⬜ | ⬜ | partial | ✅ |
| **Attendance tracking** | ⬜ | ⬜ | ✅ | ⬜ | ✅ | partial | partial | ⬜ | ✅ |
| **Official report cards (boletas)** | ⬜ | ⬜ | ✅ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | partial (PDF via jsPDF, backend wiring needed) |
| **Parent portal** | partial | partial | ✅ | ⬜ | ✅ | ✅ | partial | ✅ | ✅ |
| **Student portal** | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ |
| **Teacher portal** | partial | ✅ | ✅ | ✅ | ✅ | partial | ⬜ | ✅ | ✅ |
| **School admin portal** | ⬜ | ⬜ | ✅ | ⬜ | ✅ | partial | partial | ⬜ | ✅ |
| **Super admin / platform manager** | ⬜ | ⬜ | partial | partial | partial | partial | partial | ⬜ | ✅ |
| **Fee/tuition billing** | ⬜ | ⬜ | partial | ⬜ | partial | ✅ | ✅ | ⬜ | ✅ (module-gated) |
| **Communications / announcements** | partial | ✅ | ✅ | ✅ | ✅ | ✅ | partial | ✅ | ✅ |
| **Schedule builder** | ⬜ | ⬜ | ✅ | partial | ✅ | ⬜ | ⬜ | ⬜ | ✅ |
| **Subject management** | ⬜ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | partial | ✅ |
| **Group/classroom management** | partial | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Document management** | ⬜ | partial | partial | partial | partial | partial | partial | ⬜ | ✅ |
| **Analytics / reports** | partial | partial | ✅ | ✅ | ✅ | partial | partial | partial | ✅ |
| **Early childhood daily logs** | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ✅ | partial | partial (modules defined, not built) |
| **Gamification** | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Offline support** | ⬜ | partial | partial | partial | ⬜ | partial | ⬜ | ⬜ | ⬜ |
| **Mobile apps (native)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ (web only) |
| **Pricing accessible for LATAM SMB** | partial | ✅ | ⬜ | ⬜ | ⬜ | partial | partial | partial | ✅ |
| **Multi-level school (kinder+primaria)** | ⬜ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ |
| **Deployment history / audit** | ⬜ | ⬜ | partial | partial | partial | ⬜ | ⬜ | ⬜ | ✅ |
| **Impersonation / support mode** | ⬜ | ⬜ | partial | partial | partial | ⬜ | ⬜ | ⬜ | ✅ |

---

## 3. Strategic Summary

### EduCore's Defensible Advantages
1. **LATAM-native stack**: MXN billing, fiscal data (RFC/CFDI schema), Spanish-first UX, timezone MX
2. **Full operational SaaS**: enrollment + billing + grades + attendance + report cards in one product — no competitor covers all of this for the SMB segment in Mexico
3. **Modern architecture**: multi-tenant JWT + RBAC, module-gating per school level, subdomain provisioning — none of the established players offer this at entry-level pricing
4. **Hierarchical portals**: Super Admin → School Admin → Teacher → Parent → Student — rare in the mid-market

### Critical Gaps to Close Before Market Launch
1. **Mobile app / PWA**: Every major competitor has native mobile. EduCore is web-only.
2. **Early childhood modules** (`daily_logs`, `meals`, `naps`): Defined in catalog but not implemented. Brightwheel's core product.
3. **Official boletas (report cards)**: PDF generation exists but SEP-format boletas for Mexico are not present.
4. **CFDI / fiscal invoicing**: Schema has RFC/razón social but no CFDI stamp integration.
5. **SMS notifications**: Critical for parent comms in rural LATAM markets.
