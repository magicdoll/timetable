/**
 * timetableGenerator.js  v7
 * ================================================================
 * Algorithm: Degree-of-Freedom (DoF) Scheduling
 *
 * ทำไม DoF?
 *   - ปัญหาคือ "ใครลงก่อนได้เปรียบ" — ครูที่สอนหลายห้องแย่ง slot
 *   - แนวคิด: เลือก task ที่มี "ตัวเลือก slot น้อยที่สุด" ก่อนเสมอ
 *     (Minimum Remaining Values — MRV heuristic จาก CSP)
 *   - task ที่ยาก (slot ว่างน้อย) จัดก่อน → task ง่ายตามทีหลัง
 *
 * กฎครบทุกข้อ:
 *  1. ครูไม่สอนทับเวลา
 *  2. ห้องไม่ทับเวลา
 *  3. วิชาเดียวกัน ห้องเดียวกัน → คนละวัน
 *  4. Fix slots (ลูกเสือ ฯลฯ)
 *  5. ครูสอนไม่เกิน 25 คาบ/อาทิตย์
 *  6. ครูต้องมีคาบว่าง (implicit: ≤25 คาบ)
 * ================================================================
 */
import { DAYS, PERIODS, GRADE_CODE, ROOMS_PER_GRADE } from './mockData.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const key = (day, period) => `${day}__${period}`
const ALL_SLOTS = DAYS.flatMap(d => PERIODS.map(p => ({ day: d, period: p })))

// ── helpers ─────────────────────────────────────────────────────
function canPlace(st, teacherId, roomId, day, period, subjectCode, MAX_P, roomAllowedSlots) {
  const k = key(day, period)
  if (st.teacherBusy[teacherId]?.[k])              return false
  if (st.roomBusy[roomId]?.[k])                    return false
  if ((st.teacherPeriods[teacherId] || 0) >= MAX_P) return false
  if (st.roomSubjDays[roomId]?.[subjectCode]?.has(day)) return false
  // ถ้าห้องนี้มี slot ที่อนุญาต → ตรวจสอบ
  if (roomAllowedSlots && !roomAllowedSlots[roomId]?.has(k)) return false
  return true
}

function doPlace(st, teacherId, roomId, day, period, subjectName, subjectCode, teacherName) {
  const k = key(day, period)
  st.teacherBusy[teacherId][k] = true
  st.roomBusy[roomId][k]       = true
  st.teacherPeriods[teacherId]++
  if (!st.roomSubjDays[roomId][subjectCode]) st.roomSubjDays[roomId][subjectCode] = new Set()
  st.roomSubjDays[roomId][subjectCode].add(day)
  st.teacherSched[teacherId][day][period] = { subject: subjectName, subjectCode, room: roomId }
  st.classSched[roomId][day][period]      = { subject: subjectName, subjectCode, teacher: teacherId, teacherName }
}

function doUnplace(st, teacherId, roomId, day, period, subjectCode) {
  const k = key(day, period)
  delete st.teacherBusy[teacherId][k]
  delete st.roomBusy[roomId][k]
  st.teacherPeriods[teacherId]--
  st.roomSubjDays[roomId][subjectCode]?.delete(day)
  delete st.teacherSched[teacherId][day][period]
  delete st.classSched[roomId][day][period]
}

/** นับ slot ที่ task นี้ยังใช้ได้จริง (Degree of Freedom) */
function countDof(st, task, MAX_P, roomAllowedSlots, allSlots) {
  return allSlots.filter(({ day, period }) =>
    canPlace(st, task.teacherId, task.roomId, day, period, task.subjectCode, MAX_P, roomAllowedSlots)
  ).length
}

// ── Main ─────────────────────────────────────────────────────────
export function generateTimetable(gradeName, teachers, options = {}) {
  const gradeCode  = GRADE_CODE[gradeName]
  const numRooms   = ROOMS_PER_GRADE[gradeName]
  const rooms      = options.customRooms
    || Array.from({ length: numRooms }, (_, i) => `${gradeCode}/${i + 1}`)
  const MAX_P      = 25
  // roomPeriods: { roomId: { day: periodsCount } }
  // เช่น { 'ป.5/1': { 'จันทร์':5, 'อังคาร':6, 'พุธ':5, 'พฤหัสบดี':5, 'ศุกร์':5 } }
  const roomPeriodsMap = options.roomPeriods || {}

  // สร้าง Set ของ slot key ที่ห้องนั้นเรียนได้
  const roomAllowedSlots = {}
  rooms.forEach(rid => {
    const dayMap = roomPeriodsMap[rid] || {}
    const slots = new Set()
    DAYS.forEach(day => {
      const maxP = dayMap[day] ?? PERIODS.length
      for (let p = 1; p <= maxP; p++) slots.add(key(day, p))
    })
    roomAllowedSlots[rid] = slots
  })

  // max period ทั้งระบบ (รองรับ 6+ คาบ)
  const globalMaxPeriod = Math.max(
    PERIODS.length,
    ...rooms.flatMap(rid => DAYS.map(day => roomPeriodsMap[rid]?.[day] ?? PERIODS.length))
  )
  const ALL_SLOTS_DYN = DAYS.flatMap(d =>
    Array.from({ length: globalMaxPeriod }, (_, i) => ({ day: d, period: i + 1 }))
  )

  const fixedSlots = options.fixedSlots
    || [{ subjectName: 'ลูกเสือ', subjectCode: 'SCOUT', day: 'พุธ', period: 5 }]
  const preLocks = options.preLocks || []
  const teacherUnavailable = options.teacherUnavailable || []

  // ── init state ───────────────────────────────────────────────
  const st = {
    teacherBusy:    {},   // [tid][k] = true
    teacherPeriods: {},   // [tid] = n
    roomBusy:       {},   // [rid][k] = true
    roomSubjDays:   {},   // [rid][code] = Set<day>
    teacherSched:   {},   // [tid][day][p] = slot
    classSched:     {},   // [rid][day][p] = slot
  }
  teachers.forEach(t => {
    st.teacherBusy[t.teacherId]    = {}
    st.teacherPeriods[t.teacherId] = 0
    st.teacherSched[t.teacherId]   = {}
    DAYS.forEach(d => { st.teacherSched[t.teacherId][d] = {} })
  })
  rooms.forEach(r => {
    st.roomBusy[r]     = {}
    st.roomSubjDays[r] = {}
    st.classSched[r]   = {}
    DAYS.forEach(d => { st.classSched[r][d] = {} })
  })

  // ── Fix slots ────────────────────────────────────────────────
  fixedSlots.forEach(fs => {
    const fk = key(fs.day, fs.period)
    const sc = fs.subjectCode || 'FIXED'
    rooms.forEach(rid => {
      st.roomBusy[rid][fk] = true
      if (!st.roomSubjDays[rid][sc]) st.roomSubjDays[rid][sc] = new Set()
      st.roomSubjDays[rid][sc].add(fs.day)
      st.classSched[rid][fs.day][fs.period] = {
        subject: fs.subjectName, subjectCode: sc, teacher: '-', teacherName: '-',
      }
    })
    teachers.forEach(t => {
      st.teacherBusy[t.teacherId][fk] = true
      st.teacherPeriods[t.teacherId]++
      st.teacherSched[t.teacherId][fs.day][fs.period] = {
        subject: fs.subjectName, subjectCode: sc, room: '-',
      }
    })
  })

  // ── Teacher Unavailable slots ────────────────────────────────
  // ครูแจ้งไม่ว่างคาบนี้ → mark teacherBusy เท่านั้น (ห้องยังว่าง)
  teacherUnavailable.forEach(u => {
    if (!st.teacherBusy[u.teacherId]) return
    const fk = key(u.day, u.period)
    st.teacherBusy[u.teacherId][fk] = true
    // บันทึกเหตุผลไว้ด้วยแต่ไม่นับเป็นคาบสอน (ไม่ increment teacherPeriods)
    st.teacherSched[u.teacherId][u.day][u.period] = {
      subject: u.reason || 'ไม่ว่าง', subjectCode: 'BUSY',
      room: '-', unavailable: true,
    }
  })

  // ── Pre-locked slots ─────────────────────────────────────────
  // ครูเลือกล็อคคาบไว้ล่วงหน้า → ใส่ลงตารางก่อน random
  const preLockKey = new Set(preLocks.map(pl => `${pl.teacherId}__${pl.roomId}__${pl.day}__${pl.period}`))
  preLocks.forEach(pl => {
    if (!rooms.includes(pl.roomId)) return
    const fk = key(pl.day, pl.period)
    // mark ห้องและครูว่าง
    st.roomBusy[pl.roomId][fk] = true
    if (!st.roomSubjDays[pl.roomId][pl.subjectCode]) st.roomSubjDays[pl.roomId][pl.subjectCode] = new Set()
    st.roomSubjDays[pl.roomId][pl.subjectCode].add(pl.day)
    st.classSched[pl.roomId][pl.day][pl.period] = {
      subject: pl.subjectName, subjectCode: pl.subjectCode,
      teacher: pl.teacherId, teacherName: pl.teacherName,
      preLocked: true,
    }
    if (st.teacherBusy[pl.teacherId]) {
      st.teacherBusy[pl.teacherId][fk] = true
      st.teacherPeriods[pl.teacherId]++
      st.teacherSched[pl.teacherId][pl.day][pl.period] = {
        subject: pl.subjectName, subjectCode: pl.subjectCode, room: pl.roomId, preLocked: true,
      }
    }
  })

  // ── Build tasks ──────────────────────────────────────────────
  // แต่ละ task = { ครู, ห้อง, วิชา, left, total }
  const tasks = []
  teachers.forEach(t => {
    t.assignments.forEach(a => {
      if (!rooms.includes(a.roomId)) return
      // นับว่า pre-lock ไปแล้วกี่คาบสำหรับ teacher+room+subject นี้
      const lockedAlready = preLocks.filter(
        pl => pl.teacherId === t.teacherId && pl.roomId === a.roomId && pl.subjectCode === a.subjectCode
      ).length
      const remaining = a.periodsPerWeek - lockedAlready
      for (let i = 0; i < remaining; i++) {
        tasks.push({
          teacherId:    t.teacherId,
          teacherName:  t.teacherName,
          roomId:       a.roomId,
          subjectCode:  a.subjectCode,
          subjectName:  a.subjectName,
          totalInGroup: a.periodsPerWeek,
        })
      }
    })
  })

  // ── DoF scheduling ──────────────────────────────────────────
  const pending   = shuffle(tasks)
  const placed    = []
  const failed    = []

  while (pending.length > 0) {
    let bestIdx = 0
    let bestDof = Infinity
    for (let i = 0; i < pending.length; i++) {
      const dof = countDof(st, pending[i], MAX_P, roomAllowedSlots, ALL_SLOTS_DYN)
      if (dof < bestDof) { bestDof = dof; bestIdx = i }
    }

    const task = pending.splice(bestIdx, 1)[0]

    if (bestDof === 0) {
      const swapped = trySwap(st, task, MAX_P, roomAllowedSlots, ALL_SLOTS_DYN)
      if (swapped) {
        placed.push(task)
      } else {
        failed.push(task)
      }
      continue
    }

    const slotPool = shuffle(ALL_SLOTS_DYN).filter(({ day, period }) =>
      canPlace(st, task.teacherId, task.roomId, day, period, task.subjectCode, MAX_P, roomAllowedSlots)
    )
    const { day, period } = slotPool[0]
    doPlace(st, task.teacherId, task.roomId, day, period, task.subjectName, task.subjectCode, task.teacherName)
    placed.push(task)
  }

  // ── Warnings ─────────────────────────────────────────────────
  // รวม failed tasks เป็นกลุ่ม (ครู+ห้อง+วิชา)
  const failMap = {}
  failed.forEach(t => {
    const fk = `${t.teacherId}__${t.roomId}__${t.subjectCode}`
    if (!failMap[fk]) failMap[fk] = { ...t, left: 0 }
    failMap[fk].left++
  })

  const warnings = Object.values(failMap).map(f => ({
    type:        'unplaced',
    teacherName: f.teacherName,
    teacherId:   f.teacherId,
    subjectName: f.subjectName,
    subjectCode: f.subjectCode,
    roomId:      f.roomId,
    placed:      f.totalInGroup - f.left,
    total:       f.totalInGroup,
    left:        f.left,
    reason:      st.teacherPeriods[f.teacherId] >= MAX_P ? '(ครูเต็ม 25 คาบ)' : '(ไม่มี slot ว่าง)',
    msg:         `${f.teacherName} / ${f.subjectName} / ${f.roomId}: ลงได้ ${f.totalInGroup - f.left}/${f.totalInGroup} คาบ`,
  }))

  rooms.forEach(rid => {
    const allowed = roomAllowedSlots[rid]
    DAYS.forEach(day => {
      for (let period = 1; period <= globalMaxPeriod; period++) {
        if (allowed && !allowed.has(key(day, period))) continue  // slot นี้ห้องไม่ได้เรียน
        if (!st.classSched[rid][day][period]) {
          warnings.push({ type: 'empty', roomId: rid, day, period, msg: `ห้อง ${rid} วัน${day} คาบ${period} ว่าง` })
        }
      }
    })
  })

  const teacherLoad = {}
  teachers.forEach(t => {
    teacherLoad[t.teacherId] = { name: t.teacherName, periods: st.teacherPeriods[t.teacherId] }
  })

  return { teacherSchedules: st.teacherSched, classSchedules: st.classSched, rooms, warnings, teacherLoad }
}

// ── Swap: ย้าย slot ที่ลงแล้วของครูคนเดียวกัน → เปิดที่ให้ task ──
function trySwap(st, task, MAX_P, roomAllowedSlots, allSlots) {
  const shuffledAll = shuffle(allSlots)
  const taskAllowed = roomAllowedSlots?.[task.roomId]

  for (const { day: td, period: tp } of shuffledAll) {
    if (taskAllowed && !taskAllowed.has(key(td, tp))) continue     // slot ไม่ถูกต้องสำหรับห้องนี้
    if (st.roomBusy[task.roomId]?.[key(td, tp)]) continue
    if (st.teacherBusy[task.teacherId]?.[key(td, tp)]) {
      const atSlot = st.teacherSched[task.teacherId][td]?.[tp]
      if (!atSlot || atSlot.room === '-') continue

      const swapRoom = atSlot.room
      const swapCode = atSlot.subjectCode
      const swapName = atSlot.subject
      const swapTName = st.classSched[swapRoom]?.[td]?.[tp]?.teacherName || ''

      if (st.roomSubjDays[task.roomId]?.[task.subjectCode]?.has(td)) continue

      for (const { day: nd, period: np } of shuffle(shuffledAll)) {
        if (nd === td && np === tp) continue
        if (!canPlace(st, task.teacherId, swapRoom, nd, np, swapCode, MAX_P, roomAllowedSlots)) continue

        doUnplace(st, task.teacherId, swapRoom, td, tp, swapCode)
        doPlace(st, task.teacherId, swapRoom, nd, np, swapName, swapCode, swapTName)
        doPlace(st, task.teacherId, task.roomId, td, tp, task.subjectName, task.subjectCode, task.teacherName)
        return true
      }
    } else {
      if (canPlace(st, task.teacherId, task.roomId, td, tp, task.subjectCode, MAX_P, roomAllowedSlots)) {
        doPlace(st, task.teacherId, task.roomId, td, tp, task.subjectName, task.subjectCode, task.teacherName)
        return true
      }
    }
  }
  return false
}
