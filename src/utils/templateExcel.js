/**
 * templateExcel.js — สร้างไฟล์ Excel Template สำหรับ Import
 * ถ้ามี currentData → ใส่ข้อมูลปัจจุบันลงไปด้วย
 */
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const DAYS    = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์']
const PERIODS = [1,2,3,4,5]
const PERIOD_TIMES = { 1:'08:30-09:30', 2:'09:30-10:30', 3:'10:30-11:30', 4:'12:30-13:30', 5:'13:30-14:30' }
const GRADES  = ['ประถม 1','ประถม 2','ประถม 3','ประถม 4','ประถม 5','ประถม 6']

const HEADER_BG   = 'FF1A237E'
const SUBHEAD_BG  = 'FFBBDEFB'
const EXAMPLE_BG  = 'FFFFF8E1'
const NOTE_BG     = 'FFE8F5E9'
const GUIDE_TEXT  = 'FF1565C0'
const WARN_TEXT   = 'FFB71C1C'

function hdrCell(cell, text, bgARGB='FF1976D2', txtARGB='FFFFFFFF', sz=10) {
  cell.value = text
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: bgARGB } }
  cell.font  = { name:'Tahoma', size:sz, bold:true, color:{ argb: txtARGB } }
  cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
  const b = { style:'thin', color:{ argb:'FFD0D0D0' } }
  cell.border = { top:b, bottom:b, left:b, right:b }
}

function dataCell(cell, text, bgARGB='FFFFFFFF', txtARGB='FF333333', bold=false) {
  cell.value = text === undefined || text === null ? '' : text
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: bgARGB } }
  cell.font  = { name:'Tahoma', size:10, bold, color:{ argb: txtARGB } }
  cell.alignment = { horizontal:'left', vertical:'middle', wrapText:true }
  const b = { style:'thin', color:{ argb:'FFE0E0E0' } }
  cell.border = { top:b, bottom:b, left:b, right:b }
}

function noteRow(ws, rowNum, text, colSpan=6) {
  ws.mergeCells(rowNum, 1, rowNum, colSpan)
  const c = ws.getCell(rowNum, 1)
  c.value = text
  c.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: NOTE_BG } }
  c.font  = { name:'Tahoma', size:9, italic:true, color:{ argb: GUIDE_TEXT } }
  c.alignment = { horizontal:'left', vertical:'middle', indent:1, wrapText:true }
  ws.getRow(rowNum).height = 18
}

// ── Sheet: คำแนะนำ ───────────────────────────────────────────────
function buildGuideSheet(wb) {
  const ws = wb.addWorksheet('📖 คำแนะนำ', { views:[{showGridLines:false}] })
  ws.getColumn(1).width = 30
  ws.getColumn(2).width = 60

  ws.mergeCells('A1:B1')
  const t = ws.getCell('A1')
  t.value = '📖 คำแนะนำการใช้ไฟล์ Template'
  t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: HEADER_BG } }
  t.font  = { name:'Tahoma', size:14, bold:true, color:{ argb:'FFFFFFFF' } }
  t.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 34

  const lines = [
    ['Sheet', 'คำอธิบาย'],
    ['📚 ห้องเรียน', 'กำหนดจำนวนห้องแต่ละระดับชั้น'],
    ['👨‍🏫 ครูผู้สอน', 'รายชื่อครู (ID + ชื่อ)'],
    ['📋 มอบหมายสอน', 'ครูคนไหนสอนวิชาอะไร ห้องไหน กี่คาบ'],
    ['🎨 วิชา & สี', 'รหัสวิชา ชื่อวิชา และสีที่ใช้แสดงในตาราง'],
    ['📌 วิชา Fix', 'วิชาที่ fix เวลาตายตัว เช่น ลูกเสือ วันพุธ คาบ 5'],
    ['⏰ คาบเรียน', 'กำหนดว่าแต่ละห้องเรียนคาบไหนบ้าง'],
    ['', ''],
    ['ขั้นตอนการใช้งาน', ''],
    ['1. กรอกข้อมูล', 'กรอกข้อมูลในแต่ละ Sheet ตามคำอธิบาย'],
    ['2. บันทึกไฟล์', 'บันทึกเป็น .xlsx (Excel format)'],
    ['3. Import', 'กดปุ่ม "📥 Import Excel" ในระบบ แล้วเลือกไฟล์นี้'],
    ['4. ตรวจสอบ', 'ระบบจะโหลดข้อมูลเข้ามา ตรวจสอบใน "จัดการข้อมูล"'],
    ['5. Random', 'กด Random เพื่อจัดตารางโดยอัตโนมัติ'],
    ['', ''],
    ['⚠️ หมายเหตุ', 'อย่าลบ header row (แถวที่มีสีน้ำเงิน)'],
    ['⚠️ หมายเหตุ', 'teacherId ต้องตรงกันใน Sheet ครูผู้สอน และมอบหมายสอน'],
    ['⚠️ หมายเหตุ', 'รหัสวิชา (เช่น TH, MA) ต้องตรงกันในทุก Sheet'],
  ]

  lines.forEach((line, i) => {
    const row = ws.getRow(i + 3)
    row.height = 22
    if (i === 0) {
      hdrCell(ws.getCell(i+3, 1), line[0], 'FF1976D2')
      hdrCell(ws.getCell(i+3, 2), line[1], 'FF1976D2')
    } else if (line[0] === '') {
      ws.mergeCells(i+3, 1, i+3, 2)
    } else if (line[1] === '') {
      ws.mergeCells(i+3, 1, i+3, 2)
      dataCell(ws.getCell(i+3, 1), line[0], 'FFE8EAF6', HEADER_BG, true)
      row.height = 26
    } else {
      const isWarn = line[0].startsWith('⚠️')
      dataCell(ws.getCell(i+3, 1), line[0], isWarn?'FFFFF3E0':'FFFAFAFA', isWarn?WARN_TEXT:'FF555555', isWarn)
      dataCell(ws.getCell(i+3, 2), line[1], 'FFFFFFFF', 'FF333333')
    }
  })
}

// ── Sheet: ห้องเรียน ─────────────────────────────────────────────
function buildRoomsSheet(wb, currentData) {
  const ws = wb.addWorksheet('📚 ห้องเรียน', { views:[{showGridLines:false}] })
  ws.getColumn(1).width = 20; ws.getColumn(2).width = 16; ws.getColumn(3).width = 40

  ws.mergeCells('A1:C1')
  const t = ws.getCell('A1')
  t.value = 'ข้อมูลห้องเรียนแต่ละระดับชั้น'
  t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: HEADER_BG } }
  t.font  = { name:'Tahoma', size:13, bold:true, color:{ argb:'FFFFFFFF' } }
  t.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 30

  noteRow(ws, 2, '💡 กรอกจำนวนห้องแต่ละระดับชั้น (1-12)', 3)
  ws.getRow(3).height = 22
  ;['ระดับชั้น','จำนวนห้อง','หมายเหตุ'].forEach((h,i) => hdrCell(ws.getCell(3, i+1), h))

  const roomData = currentData?.roomCounts || {}
  const GRADE_CODE_MAP = {
    'ประถม 1':'ป.1','ประถม 2':'ป.2','ประถม 3':'ป.3',
    'ประถม 4':'ป.4','ประถม 5':'ป.5','ประถม 6':'ป.6',
  }
  GRADES.forEach((g, i) => {
    const row = ws.getRow(4 + i)
    row.height = 22
    const cnt = roomData[g] ?? 5
    const gc = GRADE_CODE_MAP[g] || g
    const roomList = Array.from({length:cnt},(_,ri)=>`${gc}/${ri+1}`).join(', ')
    dataCell(ws.getCell(4+i,1), g, i%2===0?'FFF8F9FA':'FFFFFFFF', 'FF333333', true)
    dataCell(ws.getCell(4+i,2), cnt, i%2===0?'FFFFFFF8':'FFFFFFFF', 'FF1565C0', true)
    dataCell(ws.getCell(4+i,3), roomList, i%2===0?'FFF8F9FA':'FFFFFFFF', 'FF888888')
  })
}

// ── Sheet: ครูผู้สอน ─────────────────────────────────────────────
function buildTeachersSheet(wb, currentData) {
  const ws = wb.addWorksheet('👨‍🏫 ครูผู้สอน', { views:[{showGridLines:false}] })
  ws.getColumn(1).width = 18; ws.getColumn(2).width = 28; ws.getColumn(3).width = 20

  ws.mergeCells('A1:C1')
  const t = ws.getCell('A1')
  t.value = 'รายชื่อครูผู้สอน'
  t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: HEADER_BG } }
  t.font  = { name:'Tahoma', size:13, bold:true, color:{ argb:'FFFFFFFF' } }
  t.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 30

  noteRow(ws, 2, '💡 teacherId ต้องไม่ซ้ำ และต้องตรงกับ Sheet มอบหมายสอน', 3)
  ws.getRow(3).height = 22
  ;['teacherId','ชื่อ-นามสกุล','หมายเหตุ'].forEach((h,i) => hdrCell(ws.getCell(3, i+1), h))

  const teachers = currentData?.teachers || []
  if (teachers.length > 0) {
    teachers.forEach((t, i) => {
      const row = ws.getRow(4 + i)
      row.height = 22
      const bg = i%2===0?'FFF8F9FA':'FFFFFFFF'
      dataCell(ws.getCell(4+i,1), t.teacherId, bg, 'FF1565C0', true)
      dataCell(ws.getCell(4+i,2), t.teacherName, bg, 'FF333333')
      dataCell(ws.getCell(4+i,3), '', bg, 'FF888888')
    })
  } else {
    // ตัวอย่าง
    const examples = [
      ['T001','นางสาวสมใจ ใจดี'],['T002','นายวิชัย เก่งมาก'],['T003','นางมาลี สวยงาม'],
    ]
    examples.forEach((ex, i) => {
      const row = ws.getRow(4 + i)
      row.height = 22
      dataCell(ws.getCell(4+i,1), ex[0], EXAMPLE_BG, 'FF1565C0', true)
      dataCell(ws.getCell(4+i,2), ex[1], EXAMPLE_BG, 'FF333333')
      dataCell(ws.getCell(4+i,3), '← ตัวอย่าง', EXAMPLE_BG, 'FFE65100')
    })
  }
}

// ── Sheet: มอบหมายสอน ────────────────────────────────────────────
function buildAssignmentsSheet(wb, currentData) {
  const ws = wb.addWorksheet('📋 มอบหมายสอน', { views:[{showGridLines:false}] })
  ws.getColumn(1).width = 14; ws.getColumn(2).width = 14; ws.getColumn(3).width = 12
  ws.getColumn(4).width = 22; ws.getColumn(5).width = 14

  ws.mergeCells('A1:E1')
  const t = ws.getCell('A1')
  t.value = 'การมอบหมายสอน (ครู → ห้อง → วิชา → คาบ/สัปดาห์)'
  t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: HEADER_BG } }
  t.font  = { name:'Tahoma', size:13, bold:true, color:{ argb:'FFFFFFFF' } }
  t.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 30

  noteRow(ws, 2, '💡 teacherId ต้องตรงกับ Sheet ครูผู้สอน | ห้อง เช่น ป.5/1 | รหัสวิชา เช่น TH, MA, SC', 5)
  ws.getRow(3).height = 22
  ;['teacherId','ห้อง','รหัสวิชา','ชื่อวิชา','คาบ/สัปดาห์'].forEach((h,i) => hdrCell(ws.getCell(3, i+1), h))

  const teachers = currentData?.teachers || []
  const colorMap = currentData?.colors || {}

  // helper: สีของรหัสวิชา (ใช้ custom colors ถ้ามี)
  const SUBJ_FG = {
    TH:'FFE65100',MA:'FF0D47A1',SC:'FF1B5E20',SO:'FFBF360C',EN:'FF4A148C',
    PE:'FF004D40',AR:'FFB71C1C',CO:'FF311B92',HE:'FF33691E',CR:'FF870000',SCOUT:'FF1B5E20'
  }
  function getSubjColor(code) {
    const c = colorMap[code]
    if (c?.text) return 'FF' + c.text.replace('#','').toUpperCase()
    return SUBJ_FG[code] || 'FF6A1B9A'
  }

  let row = 4
  if (teachers.some(t => t.assignments?.length > 0)) {
    teachers.forEach(t => {
      t.assignments?.forEach((a, ai) => {
        const bg = row%2===0?'FFF8F9FA':'FFFFFFFF'
        dataCell(ws.getCell(row,1), t.teacherId, bg, 'FF1565C0', true)
        dataCell(ws.getCell(row,2), a.roomId, bg)
        dataCell(ws.getCell(row,3), a.subjectCode, bg, getSubjColor(a.subjectCode), true)
        dataCell(ws.getCell(row,4), a.subjectName, bg)
        dataCell(ws.getCell(row,5), a.periodsPerWeek, bg, 'FF1565C0', true)
        ws.getRow(row).height = 22
        row++
      })
    })
  } else {
    const examples = [
      ['T001','ป.5/1','TH','ภาษาไทย',4],['T001','ป.5/2','TH','ภาษาไทย',4],
      ['T002','ป.5/1','MA','คณิตศาสตร์',4],['T003','ป.5/1','SC','วิทยาศาสตร์',3],
    ]
    examples.forEach((ex, i) => {
      const bg = EXAMPLE_BG
      const scColor = getSubjColor(ex[2])
      dataCell(ws.getCell(row,1), ex[0], bg, 'FF1565C0', true)
      dataCell(ws.getCell(row,2), ex[1], bg)
      dataCell(ws.getCell(row,3), ex[2], bg, scColor, true)
      dataCell(ws.getCell(row,4), ex[3], bg)
      dataCell(ws.getCell(row,5), ex[4], bg, 'FF1565C0', true)
      ws.getRow(row).height = 22; row++
    })
    dataCell(ws.getCell(row,1), '← แถวสีเหลือง = ตัวอย่าง ลบออกแล้วกรอกข้อมูลจริง', EXAMPLE_BG, 'FFE65100')
    ws.mergeCells(row, 1, row, 5)
  }
}

// ── Sheet: วิชา & สี ─────────────────────────────────────────────
function buildSubjectsSheet(wb, currentData) {
  const ws = wb.addWorksheet('🎨 วิชา & สี', { views:[{showGridLines:false}] })
  ws.getColumn(1).width=12; ws.getColumn(2).width=22; ws.getColumn(3).width=16
  ws.getColumn(4).width=16; ws.getColumn(5).width=16; ws.getColumn(6).width=20

  ws.mergeCells('A1:F1')
  const t = ws.getCell('A1')
  t.value = 'รายชื่อวิชาและสีที่ใช้แสดงในตาราง'
  t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: HEADER_BG } }
  t.font  = { name:'Tahoma', size:13, bold:true, color:{ argb:'FFFFFFFF' } }
  t.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 30

  noteRow(ws, 2, '💡 สีใส่เป็น HEX เช่น #FFF9C4 (พื้นหลัง) #F9A825 (ขอบ) #E65100 (ตัวหนังสือ)', 6)
  ws.getRow(3).height = 22
  ;['รหัสวิชา','ชื่อวิชา','สีพื้นหลัง','สีขอบ','สีตัวหนังสือ','Preview'].forEach((h,i) => hdrCell(ws.getCell(3,i+1),h))

  const DEFAULT_SUBJ = [
    {code:'TH',name:'ภาษาไทย',bg:'#FFF9C4',border:'#F9A825',text:'#E65100'},
    {code:'MA',name:'คณิตศาสตร์',bg:'#E3F2FD',border:'#1565C0',text:'#0D47A1'},
    {code:'SC',name:'วิทยาศาสตร์',bg:'#E8F5E9',border:'#2E7D32',text:'#1B5E20'},
    {code:'SO',name:'สังคมศึกษา',bg:'#FFF3E0',border:'#E65100',text:'#BF360C'},
    {code:'EN',name:'ภาษาอังกฤษ',bg:'#F3E5F5',border:'#6A1B9A',text:'#4A148C'},
    {code:'PE',name:'พลศึกษา',bg:'#E0F2F1',border:'#00695C',text:'#004D40'},
    {code:'AR',name:'ศิลปะ',bg:'#FCE4EC',border:'#C62828',text:'#B71C1C'},
    {code:'CO',name:'คอมพิวเตอร์',bg:'#EDE7F6',border:'#4527A0',text:'#311B92'},
    {code:'HE',name:'สุขศึกษา',bg:'#F1F8E9',border:'#558B2F',text:'#33691E'},
    {code:'CR',name:'การงานอาชีพ',bg:'#FBE9E7',border:'#BF360C',text:'#870000'},
  ]

  const colors = currentData?.colors || {}
  const subjects = Object.keys(colors).length > 0
    ? Object.entries(colors).filter(([c]) => !['SCOUT','FREE','BUSY'].includes(c))
        .map(([code, v]) => ({ code, name: v.label||code, bg: v.bg||'#F5F5F5', border: v.border||'#BDBDBD', text: v.text||'#333333' }))
    : DEFAULT_SUBJ

  subjects.forEach((s, i) => {
    const row = i + 4
    const bg  = i%2===0?'FFF8F9FA':'FFFFFFFF'
    ws.getRow(row).height = 22
    dataCell(ws.getCell(row,1), s.code, bg, 'FF6A1B9A', true)
    dataCell(ws.getCell(row,2), s.name, bg, 'FF333333')
    dataCell(ws.getCell(row,3), s.bg,   bg, 'FF1565C0')
    dataCell(ws.getCell(row,4), s.border, bg, 'FF1565C0')
    dataCell(ws.getCell(row,5), s.text,  bg, 'FF1565C0')
    // Preview cell — ใส่สีพื้นหลัง + สีข้อความ + สีขอบตามที่กำหนด
    const pv = ws.getCell(row, 6)
    pv.value = s.name
    try {
      const bgHex  = s.bg.replace('#','').toUpperCase()
      const txtHex = s.text.replace('#','').toUpperCase()
      const brdHex = s.border.replace('#','').toUpperCase()
      pv.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: 'FF'+bgHex } }
      pv.font = { name:'Tahoma', size:9, bold:true, color:{ argb: 'FF'+txtHex } }
      const brd = { style:'medium', color:{ argb: 'FF'+brdHex } }
      const thin = { style:'thin', color:{ argb: 'FFE0E0E0' } }
      pv.border = { top:thin, bottom:thin, left:brd, right:thin }
    } catch(e) {
      pv.font = { name:'Tahoma', size:9, bold:true }
    }
    pv.alignment = { horizontal:'center', vertical:'middle' }
  })
}

// ── Sheet: วิชา Fix ──────────────────────────────────────────────
function buildFixedSheet(wb, currentData) {
  const ws = wb.addWorksheet('📌 วิชา Fix', { views:[{showGridLines:false}] })
  ws.getColumn(1).width=14; ws.getColumn(2).width=22; ws.getColumn(3).width=16; ws.getColumn(4).width=10; ws.getColumn(5).width=20

  ws.mergeCells('A1:E1')
  const t = ws.getCell('A1')
  t.value = 'วิชาที่กำหนดเวลาตายตัว (Fix Slots)'
  t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: HEADER_BG } }
  t.font  = { name:'Tahoma', size:13, bold:true, color:{ argb:'FFFFFFFF' } }
  t.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 30

  noteRow(ws, 2, `💡 วัน: ${DAYS.join(', ')} | คาบ: 1-5`, 5)
  ws.getRow(3).height = 22
  ;['รหัสวิชา','ชื่อวิชา','วัน','คาบ','เวลา'].forEach((h,i) => hdrCell(ws.getCell(3,i+1),h))

  const fixed = currentData?.fixedSlots
  const data  = fixed?.length > 0 ? fixed : [{ subjectCode:'SCOUT', subjectName:'ลูกเสือ', day:'พุธ', period:5 }]

  data.forEach((fs, i) => {
    const row = i + 4
    ws.getRow(row).height = 22
    const bg = i%2===0?'FFF8F9FA':'FFFFFFFF'
    dataCell(ws.getCell(row,1), fs.subjectCode, bg, 'FF388E3C', true)
    dataCell(ws.getCell(row,2), fs.subjectName, bg)
    dataCell(ws.getCell(row,3), fs.day, bg, 'FF333333')
    dataCell(ws.getCell(row,4), fs.period, bg, 'FF1565C0', true)
    dataCell(ws.getCell(row,5), PERIOD_TIMES[fs.period]||'', bg, 'FF888888')
  })
}

// ── Sheet: คาบเรียน ──────────────────────────────────────────────
function buildPeriodsSheet(wb, currentData) {
  const ws = wb.addWorksheet('⏰ คาบเรียน', { views:[{showGridLines:false}] })
  ws.getColumn(1).width=16; ws.getColumn(2).width=24; ws.getColumn(3).width=12
  ws.getColumn(4).width=12; ws.getColumn(5).width=12; ws.getColumn(6).width=12; ws.getColumn(7).width=12

  ws.mergeCells('A1:G1')
  const t = ws.getCell('A1')
  t.value = 'กำหนดจำนวนคาบเรียนต่อวันต่อห้อง'
  t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: HEADER_BG } }
  t.font  = { name:'Tahoma', size:13, bold:true, color:{ argb:'FFFFFFFF' } }
  t.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 30

  noteRow(ws, 2, '💡 ใส่จำนวนคาบในแต่ละช่อง เช่น วันอังคาร ห้อง 5/1 = 6 คาบ  |  ค่าปกติ = 5 คาบ/วัน', 7)
  noteRow(ws, 3, '⚠️ format ใหม่: ใส่จำนวนคาบต่อวัน (ไม่ใช่ list 1,2,3,4,5 แบบเดิม)', 7)
  ws.getRow(4).height = 22

  const DAYS_TH = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์']
  ;['ห้อง',...DAYS_TH,'รวม/สัปดาห์'].forEach((h,i) =>
    hdrCell(ws.getCell(4, i+1), h, 'FF0288D1')
  )

  // roomPeriods format ใหม่: { roomId: { day: count } }
  const roomPeriods = currentData?.roomPeriods || {}
  const rooms = currentData?.rooms || []

  const rows = rooms.length > 0
    ? rooms.map(rid => {
        const dayMap = roomPeriods[rid] || {}
        const days = {}
        DAYS_TH.forEach(d => { days[d] = dayMap[d] ?? 5 })
        return { rid, days }
      })
    : [
        { rid:'ป.5/1', days:{จันทร์:5,อังคาร:6,พุธ:5,พฤหัสบดี:5,ศุกร์:5} },
        { rid:'ป.5/2', days:{จันทร์:5,อังคาร:5,พุธ:5,พฤหัสบดี:5,ศุกร์:5} },
        { rid:'ป.5/3', days:{จันทร์:5,อังคาร:5,พุธ:5,พฤหัสบดี:5,ศุกร์:5} },
      ]

  rows.forEach((item, i) => {
    const row = i + 5
    ws.getRow(row).height = 22
    const bg = i%2===0?'FFF8F9FA':'FFFFFFFF'
    const isExample = rooms.length === 0

    dataCell(ws.getCell(row,1), item.rid, isExample?EXAMPLE_BG:bg, 'FF1565C0', true)
    let total = 0
    DAYS_TH.forEach((d, di) => {
      const val = item.days[d] ?? 5
      total += val
      const isSpecial = val !== 5
      const cell = ws.getCell(row, di+2)
      cell.value = val
      cell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: isExample?EXAMPLE_BG:(isSpecial?'FFFFF3E0':bg) } }
      cell.font  = { name:'Tahoma', size:11, bold:isSpecial, color:{ argb: isSpecial?'FFC62828':'FF333333' } }
      cell.alignment = { horizontal:'center', vertical:'middle' }
      const b = { style:'thin', color:{ argb:'FFE0E0E0' } }
      cell.border = { top:b, bottom:b, left:b, right:b }
    })
    // รวม/สัปดาห์
    const tc = ws.getCell(row, 7)
    tc.value = total
    tc.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: isExample?EXAMPLE_BG:(total>25?'FFFFF3E0':bg) } }
    tc.font  = { name:'Tahoma', size:11, bold:true, color:{ argb: total>25?'FFC62828':'FF2E7D32' } }
    tc.alignment = { horizontal:'center', vertical:'middle' }
    const b = { style:'thin', color:{ argb:'FFE0E0E0' } }
    tc.border = { top:b, bottom:b, left:b, right:b }
  })

  if (rooms.length === 0) {
    const nr = rows.length + 5
    ws.mergeCells(nr, 1, nr, 7)
    dataCell(ws.getCell(nr,1), '← แถวสีเหลือง = ตัวอย่าง แก้ไขตามข้อมูลจริง', EXAMPLE_BG, 'FFE65100')
  }
}

// ── Main ──────────────────────────────────────────────────────────
export async function downloadTemplate(currentData) {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'School Timetable System'
  wb.created  = new Date()
  wb.modified = new Date()

  buildGuideSheet(wb)
  buildRoomsSheet(wb, currentData)
  buildTeachersSheet(wb, currentData)
  buildAssignmentsSheet(wb, currentData)
  buildSubjectsSheet(wb, currentData)
  buildFixedSheet(wb, currentData)
  buildPeriodsSheet(wb, currentData)

  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const date   = new Date().toLocaleDateString('th-TH').replace(/\//g,'-')
  const hasData = currentData?.teachers?.length > 0
  saveAs(blob, `template_ตารางเรียน${hasData?'_พร้อมข้อมูล':''}_${date}.xlsx`)
}
