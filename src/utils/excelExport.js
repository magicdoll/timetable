/**
 * excelExport.js v3 — ExcelJS สร้าง Excel สวยๆ มีสี ตาราง ครบ
 */
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const DAYS         = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์']
const PERIODS      = [1,2,3,4,5]

const DEFAULT_COLORS = {
  TH:   {bg:'FFFFF9C4',border:'F9A825',text:'E65100'},
  MA:   {bg:'FFE3F2FD',border:'1565C0',text:'0D47A1'},
  SC:   {bg:'FFE8F5E9',border:'2E7D32',text:'1B5E20'},
  SO:   {bg:'FFFFF3E0',border:'E65100',text:'BF360C'},
  EN:   {bg:'FFF3E5F5',border:'6A1B9A',text:'4A148C'},
  PE:   {bg:'FFE0F2F1',border:'00695C',text:'004D40'},
  AR:   {bg:'FFFCE4EC',border:'C62828',text:'B71C1C'},
  CO:   {bg:'FFEDE7F6',border:'4527A0',text:'311B92'},
  HE:   {bg:'FFF1F8E9',border:'558B2F',text:'33691E'},
  CR:   {bg:'FFFBE9E7',border:'BF360C',text:'870000'},
  SCOUT:{bg:'FFF1F8E9',border:'388E3C',text:'1B5E20'},
  FREE: {bg:'FFF5F5F5',border:'9E9E9E',text:'616161'},
  BUSY: {bg:'FFFFF3E0',border:'E65100',text:'BF360C'},
}

function toARGB(hex) {
  if (!hex) return 'FF888888'
  const h = hex.replace('#','')
  return h.length === 6 ? 'FF' + h.toUpperCase() : h.toUpperCase()
}

function getColor(code, customColors) {
  const c = customColors?.[code]
  if (c) return { bg: toARGB(c.bg||'#F5F5F5'), border: toARGB(c.border||'#BDBDBD'), text: toARGB(c.text||'#333333') }
  return DEFAULT_COLORS[code] || { bg:'FFF5F5F5', border:'FFBDBDBD', text:'FF555555' }
}

function border(style='thin', argb='FFD0D0D0') { return { style, color:{ argb } } }

function applyBorderAll(cell, style='thin', argb='FFD0D0D0') {
  const b = border(style, argb)
  cell.border = { top:b, bottom:b, left:b, right:b }
}

function headerCell(cell, bgARGB, text, txtARGB='FFFFFFFF') {
  cell.value = text
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: bgARGB } }
  cell.font  = { name:'Tahoma', size:10, bold:true, color:{ argb: txtARGB } }
  cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
  applyBorderAll(cell, 'medium', bgARGB)
}

function fillTimetableSheet(ws, isTeacher, label, sched, customColors, themeARGB) {
  const lightARGB = themeARGB.replace('FF','FF').slice(0,2) + 'E' + themeARGB.slice(3)

  // Row 1 — title
  ws.mergeCells('A1:F1')
  const t1 = ws.getCell('A1')
  t1.value = (isTeacher ? 'ตารางสอน — ' : 'ตารางเรียน — ห้อง ') + label
  t1.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: themeARGB } }
  t1.font  = { name:'Tahoma', size:14, bold:true, color:{ argb:'FFFFFFFF' } }
  t1.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 32

  // Row 2 — sub
  ws.mergeCells('A2:F2')
  const t2 = ws.getCell('A2')
  t2.value = `คาบเรียน 5 วัน/สัปดาห์  •  ${new Date().toLocaleDateString('th-TH')}`
  t2.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: 'FFECF3FB' } }
  t2.font  = { name:'Tahoma', size:9, color:{ argb: themeARGB } }
  t2.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(2).height = 16

  // Row 3 — column headers
  ws.getRow(3).height = 40
  headerCell(ws.getCell('A3'), themeARGB, 'วัน')
  PERIODS.forEach((p,i) => {
    headerCell(ws.getCell(3, i+2), themeARGB, `คาบ ${p}`)
  })

  // Rows 4-8 — data
  DAYS.forEach((day, di) => {
    ws.getRow(4+di).height = 50
    const dayCell = ws.getCell(4+di, 1)
    dayCell.value = day
    dayCell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFECF3FB' } }
    dayCell.font  = { name:'Tahoma', size:10, bold:true, color:{ argb: themeARGB } }
    dayCell.alignment = { horizontal:'center', vertical:'middle' }
    dayCell.border = {
      top: border('thin','FFE0E0E0'), bottom: border('thin','FFE0E0E0'),
      left: border('medium', themeARGB), right: border('medium', themeARGB)
    }

    PERIODS.forEach((period, pi) => {
      const cell = ws.getCell(4+di, 2+pi)
      const slot = sched?.[day]?.[period]

      if (!slot || !slot.subject) {
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFAFAFA' } }
        applyBorderAll(cell, 'thin', 'FFF0F0F0')
        return
      }

      const c = getColor(slot.subjectCode, customColors)
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: c.bg } }
      cell.font = { name:'Tahoma', size:9, bold:true, color:{ argb: c.text } }
      cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
      cell.border = {
        top:    border('thin','FFE0E0E0'),
        bottom: border('thin','FFE0E0E0'),
        left:   border('thick', c.border),
        right:  border('thin','FFE0E0E0'),
      }

      let val = ''
      if (slot.unavailable) {
        val = '🚫 ไม่ว่าง'
        if (slot.subject && slot.subject !== 'ไม่ว่าง') val += '\n' + slot.subject
      } else if (isTeacher) {
        val = slot.subject
        if (slot.room && slot.room !== '-') val += '\nห้อง ' + slot.room
      } else {
        const lock = slot.preLocked ? '🔒 ' : ''
        val = lock + slot.subject
        if (slot.teacherName && slot.teacherName !== '-') val += '\n' + slot.teacherName
      }
      cell.value = val
    })
  })

  ws.getColumn(1).width = 14
  PERIODS.forEach((_,i) => { ws.getColumn(2+i).width = 19 })
}

function fillSummarySheet(ws, teachers, rooms, grade) {
  ws.mergeCells('A1:D1')
  const t = ws.getCell('A1')
  t.value = `สรุปตารางเรียนตารางสอน — ${grade}`
  t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1A237E' } }
  t.font  = { name:'Tahoma', size:14, bold:true, color:{ argb:'FFFFFFFF' } }
  t.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(1).height = 34

  ws.mergeCells('A2:D2')
  const s = ws.getCell('A2')
  s.value = `ครู ${teachers.length} คน  •  ห้อง ${rooms.length} ห้อง  •  สร้างเมื่อ ${new Date().toLocaleString('th-TH')}`
  s.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFE8EAF6' } }
  s.font  = { name:'Tahoma', size:10, color:{ argb:'FF3949AB' } }
  s.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  ws.getRow(2).height = 20

  const addSection = (startRow, title, themeARGB, items, typeLabel) => {
    ws.getRow(startRow).height = 14
    const hRow = ws.getRow(startRow + 1)
    hRow.height = 22
    ;['ลำดับ','ชื่อ','ประเภท','Sheet'].forEach((v,i) => {
      const c = hRow.getCell(i+1)
      c.value = v
      c.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: themeARGB } }
      c.font  = { name:'Tahoma', size:10, bold:true, color:{ argb:'FFFFFFFF' } }
      c.alignment = { horizontal:'center', vertical:'middle' }
      applyBorderAll(c, 'thin', themeARGB)
    })
    items.forEach((item, i) => {
      const row = ws.getRow(startRow + 2 + i)
      row.height = 20
      const bg = i%2===0 ? 'FFF8FAFF' : 'FFFFFFFF'
      const sheetName = typeLabel === 'ครู' ? `ครู_${item.teacherName||item}` : `ห้อง_${(item||'').replace('/','_')}`
      ;[`${i+1}`, item.teacherName||item, typeLabel, sheetName].forEach((v,ci) => {
        const cell = row.getCell(ci+1)
        cell.value = v
        cell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: bg } }
        cell.font  = { name:'Tahoma', size:10, color:{ argb: themeARGB } }
        cell.alignment = { horizontal: ci===0?'center':'left', vertical:'middle' }
        applyBorderAll(cell)
      })
    })
    return startRow + 2 + items.length
  }

  addSection(3, 'ตารางสอนครู', 'FF1976D2', teachers, 'ครู')
  addSection(6 + teachers.length, 'ตารางเรียนห้อง', 'FF388E3C', rooms, 'ห้อง')

  ws.getColumn(1).width = 8
  ws.getColumn(2).width = 26
  ws.getColumn(3).width = 16
  ws.getColumn(4).width = 26
}

// ── Main ──────────────────────────────────────────────────────────
export async function exportToExcel({ grade, teachers, rooms, classSchedules, teacherSchedules, customColors }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'School Timetable System'
  wb.created = new Date()

  // สรุป
  const wsSummary = wb.addWorksheet('📋 สรุป', { views:[{showGridLines:false}] })
  fillSummarySheet(wsSummary, teachers, rooms, grade)

  // ตารางสอนครู
  teachers.forEach(t => {
    const ws = wb.addWorksheet(`ครู_${t.teacherName}`.slice(0,31), { views:[{showGridLines:false}] })
    fillTimetableSheet(ws, true, t.teacherName, teacherSchedules?.[t.teacherId], customColors, 'FF1565C0')
  })

  // ตารางเรียนห้อง
  rooms.forEach(roomId => {
    const ws = wb.addWorksheet(`ห้อง_${roomId}`.replace('/','_').slice(0,31), { views:[{showGridLines:false}] })
    fillTimetableSheet(ws, false, roomId, classSchedules?.[roomId], customColors, 'FF2E7D32')
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const date   = new Date().toLocaleDateString('th-TH').replace(/\//g,'-')
  saveAs(blob, `ตารางเรียน_${grade}_${date}.xlsx`)
}
