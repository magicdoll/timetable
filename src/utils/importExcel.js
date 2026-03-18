/**
 * importExcel.js — อ่านไฟล์ Excel template แล้วแปลงเป็น app state
 * ใช้ ExcelJS อ่าน workbook แล้ว parse แต่ละ Sheet
 */
import ExcelJS from 'exceljs'

// อ่านค่า cell เป็น string ปลอดภัย
function cellStr(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return ''
  if (cell.value?.richText) return cell.value.richText.map(r => r.text).join('')
  return String(cell.value).trim()
}
function cellNum(cell, def = 0) {
  const v = cell?.value
  if (v === null || v === undefined || v === '') return def
  const n = Number(v)
  return isNaN(n) ? def : n
}

// ── Parse Sheet: ห้องเรียน ────────────────────────────────────────
function parseRoomsSheet(ws) {
  // คอลัมน์: A=ระดับชั้น  B=จำนวนห้อง
  const result = {}
  const HEADER_WORDS = ['ระดับชั้น','grade','ห้อง','rooms','ตัวอย่าง','คำอธิบาย','sheet']
  ws.eachRow((row, ri) => {
    const grade = cellStr(row.getCell(1))
    if (!grade) return
    if (HEADER_WORDS.some(w => grade.toLowerCase().includes(w))) return  // skip header
    const count = cellNum(row.getCell(2), 0)
    if (count > 0) result[grade] = count
  })
  return result
}

// ── Parse Sheet: ครูผู้สอน ────────────────────────────────────────
function parseTeachersSheet(ws) {
  // คอลัมน์: A=teacherId  B=ชื่อครู
  const teachers = []
  const HEADER_WORDS = ['teacherid','ชื่อ','id','ครู','name','หมายเหตุ','วิชา']
  ws.eachRow((row, ri) => {
    const id = cellStr(row.getCell(1))
    if (!id) return
    if (HEADER_WORDS.some(w => id.toLowerCase().includes(w))) return  // skip header
    const name = cellStr(row.getCell(2))
    if (id && name) teachers.push({ teacherId: id, teacherName: name, assignments: [] })
  })
  return teachers
}

// ── Parse Sheet: มอบหมายสอน ──────────────────────────────────────
function parseAssignmentsSheet(ws, teachersIn) {
  // คอลัมน์: A=teacherId  B=ห้อง  C=รหัสวิชา  D=ชื่อวิชา  E=คาบ/สัปดาห์
  const teachers = teachersIn.map(t => ({ ...t, assignments: [...t.assignments] }))
  const tMap = {}
  teachers.forEach(t => { tMap[t.teacherId] = t })

  const ASSIGN_HDR = ['teacherid','ห้อง','รหัสวิชา','ชื่อวิชา','คาบ','หมายเหตุ']
  ws.eachRow((row, ri) => {
    const tid = cellStr(row.getCell(1))
    if (!tid) return
    if (ASSIGN_HDR.some(w => tid.toLowerCase().includes(w))) return  // skip header
    const roomId  = cellStr(row.getCell(2))
    const scode   = cellStr(row.getCell(3))
    const sname   = cellStr(row.getCell(4))
    const periods = cellNum(row.getCell(5), 1)
    if (!tid || !roomId || !scode) return
    if (!tMap[tid]) return
    tMap[tid].assignments.push({
      roomId, subjectCode: scode, subjectName: sname || scode, periodsPerWeek: periods
    })
  })
  return teachers
}

// ── Parse Sheet: วิชา & สี ────────────────────────────────────────
function parseSubjectsSheet(ws) {
  // คอลัมน์: A=รหัส  B=ชื่อ  C=สีพื้นหลัง(hex)  D=สีขอบ(hex)  E=สีตัวหนังสือ(hex)
  const colors = {}
  const SUBJ_HDR = ['รหัสวิชา','ชื่อวิชา','สีพื้นหลัง','สีขอบ','preview','subject','color']
  ws.eachRow((row, ri) => {
    const code = cellStr(row.getCell(1))
    if (!code) return
    if (SUBJ_HDR.some(w => code.toLowerCase().includes(w))) return  // skip header
    if (code.toLowerCase().indexOf('hex') != -1) return

    const name   = cellStr(row.getCell(2))
    const bg     = cellStr(row.getCell(3)) || '#F5F5F5'
    const border = cellStr(row.getCell(4)) || '#BDBDBD'
    const text   = cellStr(row.getCell(5)) || '#333333'
    colors[code] = { bg, border, text, label: name || code }
  })
  return colors
}

// ── Parse Sheet: วิชา Fix ─────────────────────────────────────────
function parseFixedSheet(ws) {
  // คอลัมน์: A=รหัสวิชา  B=ชื่อวิชา  C=วัน  D=คาบ
  const fixed = []
  const DAYS_TH = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์']
  const FIXED_HDR = ['รหัสวิชา','ชื่อวิชา','วัน','คาบ','หมายเหตุ','เวลา']
  ws.eachRow((row, ri) => {
    const code = cellStr(row.getCell(1))
    if (!code) return
    if (FIXED_HDR.some(w => code.toLowerCase().includes(w))) return  // skip header
    const name = cellStr(row.getCell(2))
    const day  = cellStr(row.getCell(3))
    const per  = cellNum(row.getCell(4), 0)
    if (!code || !DAYS_TH.includes(day) || !per) return
    fixed.push({ subjectCode: code, subjectName: name || code, day, period: per })
  })
  return fixed
}

// ── Parse Sheet: คาบเรียน (format ใหม่) ─────────────────────────
// คอลัมน์: A=roomId  B=จันทร์  C=อังคาร  D=พุธ  E=พฤหัสบดี  F=ศุกร์
// แต่ละช่อง = จำนวนคาบที่เรียนในวันนั้น เช่น 5, 6
function parsePeriodsSheet(ws) {
  const DAYS_TH = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์']
  const roomPeriods = {}

  // ── step 1: สแกนทุกแถวเพื่อหา header row จริง ──────────────────
  // header row ที่แท้จริงต้องมีชื่อวันอย่างน้อย 3 วัน แต่ละวันอยู่คนละ cell
  let dayColMap = {}
  let headerRowIdx = -1

  ws.eachRow((row, ri) => {
    if (headerRowIdx !== -1) return  // เจอแล้ว ข้าม
    const candidate = {}
    for (let c = 1; c <= 10; c++) {
      const v = cellStr(row.getCell(c))
      DAYS_TH.forEach(day => {
        // ตรงกันพอดี (ไม่ใช่แค่ substring ใน merged note)
        if (v === day || v.trim() === day) candidate[day] = c
      })
    }
    // ถ้าเจอชื่อวันอย่างน้อย 3 วัน → นี่คือ header row จริง
    if (Object.keys(candidate).length >= 3) {
      dayColMap = candidate
      headerRowIdx = ri
    }
  })

  if (headerRowIdx === -1) return roomPeriods  // ไม่เจอ header

  // ── step 2: อ่านข้อมูลแถวหลัง header ──────────────────────────
  ws.eachRow((row, ri) => {
    if (ri <= headerRowIdx) return  // skip header และแถวก่อน

    const roomId = cellStr(row.getCell(1))
    if (!roomId) return
    // skip แถว summary หรือ legend (A ไม่ใช่ชื่อห้อง)
    if (!roomId.match(/^ป\.\d\/\d+$/)) return

    const dayMap = {}
    let hasData = false
    DAYS_TH.forEach(day => {
      const col = dayColMap[day]
      if (!col) return
      const v = row.getCell(col).value
      if (v === null || v === undefined || v === '') return
      const n = Number(v)
      if (!isNaN(n) && n > 0) { dayMap[day] = n; hasData = true }
    })
    if (hasData) roomPeriods[roomId] = dayMap
  })
  return roomPeriods
}

// ── Main: อ่าน File → return appState ────────────────────────────
export async function importFromExcel(file) {
  const wb = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await wb.xlsx.load(buffer)

  const sheetNames = wb.worksheets.map(ws => ws.name.toLowerCase())

  const findSheet = (...keys) => {
    for (const k of keys) {
      const ws = wb.worksheets.find(s => s.name.toLowerCase().includes(k))
      if (ws) return ws
    }
    return null
  }

  const wsRooms   = findSheet('ห้องเรียน', 'rooms', 'ห้อง')
  const wsTeach   = findSheet('ครูผู้สอน', 'ครู', 'teacher')
  const wsAssign  = findSheet('มอบหมาย', 'assign')
  const wsSub     = findSheet('วิชา', 'subject', 'color', 'สี')
  const wsFixed   = findSheet('fix', 'ลูกเสือ')
  const wsPeriods = findSheet('คาบเรียน', 'period', 'คาบ')

  let teachers = wsTeach ? parseTeachersSheet(wsTeach) : []
  if (wsAssign) teachers = parseAssignmentsSheet(wsAssign, teachers)

  const result = {
    roomCounts:   wsRooms   ? parseRoomsSheet(wsRooms)     : {},
    teachers,
    colors:       wsSub     ? parseSubjectsSheet(wsSub)    : {},
    fixedSlots:   wsFixed   ? parseFixedSheet(wsFixed)     : null,
    roomPeriods:  wsPeriods ? parsePeriodsSheet(wsPeriods) : {},
    sheetsFound:  wb.worksheets.map(ws => ws.name),
  }
  return result
}
