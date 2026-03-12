import { DAYS, PERIODS } from '../utils/mockData.js'
import { DEFAULT_SUBJECT_COLORS } from '../utils/subjectColors.js'

function getStyle(subjectCode, customColors) {
  const palette = { ...DEFAULT_SUBJECT_COLORS, ...customColors }
  const c = palette[subjectCode] || { bg:'#f5f5f5', border:'#bdbdbd', text:'#555' }
  return { background: c.bg, borderLeft: `4px solid ${c.border}`, color: c.text }
}

// คำนวณ max period ใน schedule นี้ (รองรับ 6+ คาบ)
function getMaxPeriod(schedule) {
  let max = PERIODS.length
  if (!schedule) return max
  DAYS.forEach(day => {
    const dayObj = schedule[day]
    if (dayObj) {
      Object.keys(dayObj).forEach(p => { if (Number(p) > max) max = Number(p) })
    }
  })
  return max
}

export default function TimetableGrid({ schedule, mode='class', customColors={}, periodSlots=[], onCellClick }) {
  if (!schedule) return null

  const maxPeriod = getMaxPeriod(schedule)
  const periodList = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  // helper: ดึงเวลาคาบจาก periodSlots (index 0 = คาบ 1)
  function getPeriodTime(p) {
    const slot = periodSlots[p - 1]
    if (!slot) return null
    return `${slot.start}–${slot.end}`
  }

  return (
    <div className="timetable-wrapper">
      <table className="timetable-table">
        <thead>
          <tr>
            <th style={{minWidth:52,fontSize:'0.76rem'}}>วัน</th>
            {periodList.map(p=>(
              <th key={p} style={{textAlign:'center',fontSize:'0.72rem',minWidth:80}}>
                <div style={{fontWeight:700}}>คาบ {p}</div>
                {getPeriodTime(p) && (
                  <div style={{fontWeight:400,fontSize:'0.6rem',color:'#aaa',marginTop:1}}>{getPeriodTime(p)}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map(day=>(
            <tr key={day}>
              <td className="day-label" style={{fontSize:'0.76rem',padding:'3px 6px',whiteSpace:'nowrap'}}>
                {day==='พุธ'&&<span style={{color:'#2e7d32',marginRight:2}}>●</span>}{day}
              </td>
              {periodList.map(period=>{
                const slot = schedule[day]?.[period]
                const isEmpty = !slot
                const isFixed = slot?.subjectCode==='SCOUT'||slot?.subjectCode==='FIXED'
                const isBusy  = slot?.unavailable
                const style   = slot ? getStyle(slot.subjectCode, customColors) : {}
                const clickable = !!onCellClick
                if (isEmpty) {
                  return (
                    <td key={period} style={{padding:2,cursor:clickable?'pointer':'default'}}
                      onClick={clickable?()=>onCellClick(day,period,null):undefined}>
                      <div style={{
                        minHeight:44,display:'flex',alignItems:'center',justifyContent:'center',
                        border:`2px dashed ${clickable?'#ef9a9a':'#e0e0e0'}`,
                        borderRadius:6,color:clickable?'#e57373':'#ccc',fontSize:'0.68rem',
                        background:clickable?'#fff8f8':'transparent',
                      }}>
                        {clickable?'+ เลือก':'—'}
                      </div>
                    </td>
                  )
                }
                return (
                  <td key={period} style={{padding:2,cursor:clickable?'pointer':'default'}}
                    onClick={clickable?()=>onCellClick(day,period,slot):undefined}>
                    <div style={{
                      ...style,borderRadius:6,padding:'4px 5px',minHeight:44,
                      display:'flex',flexDirection:'column',justifyContent:'center',
                      fontSize:'0.74rem',lineHeight:1.25,opacity:isFixed?0.82:1,
                    }}>
                      {isBusy
                        ? <div style={{fontWeight:700}}>🚫 {slot.subject||'ไม่ว่าง'}</div>
                        : <div style={{fontWeight:700}}>{isFixed?`🏕️ ${slot.subject}`:slot.subject}</div>
                      }
                      {!isBusy && mode==='class'&&slot.teacherName&&slot.teacherName!=='-'&&(
                        <div style={{fontSize:'0.64rem',opacity:0.8,marginTop:1}}>{slot.teacherName}</div>
                      )}
                      {!isBusy && mode==='teacher'&&slot.room&&slot.room!=='-'&&(
                        <div style={{fontSize:'0.64rem',opacity:0.8,marginTop:1}}>ห้อง {slot.room}</div>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{padding:'2px 8px 4px',fontSize:'0.63rem',color:'#ccc'}}>
        ● พุธ = ลูกเสือ · จำนวนคาบแสดงตามที่ตั้งค่าไว้ต่อห้อง
      </div>
    </div>
  )
}
