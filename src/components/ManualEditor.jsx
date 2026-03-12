/**
 * ManualEditor.jsx v2
 * Layout:
 *  บน: [ตารางห้อง 8col] [Panel ตัวเลือก 4col]
 *  ล่าง: ตารางสอนครูประจำวิชา (full width)
 */
import { useState, useMemo } from 'react'
import { DAYS, PERIODS, PERIOD_TIMES } from '../utils/mockData.js'
import { DEFAULT_SUBJECT_COLORS } from '../utils/subjectColors.js'

function getStyle(code, custom = {}) {
  const c = { ...DEFAULT_SUBJECT_COLORS, ...custom }[code] || { bg: '#f5f5f5', border: '#bbb', text: '#555' }
  return { background: c.bg, borderLeft: `4px solid ${c.border}`, color: c.text }
}

export default function ManualEditor({ show, onClose, warning, classSchedules, teacherSchedules, customColors = {}, onApply }) {
  const [sel, setSel]               = useState(null)
  const [localCS, setLocalCS]       = useState(null)
  const [localTS, setLocalTS]       = useState(null)
  const [pendingExtra, setPending]  = useState([])
  const [warningPlacedCount, setWarningPlacedCount] = useState(0)  // นับคาบที่ warning หลักลงไปแล้ว
  const [msg, setMsg]               = useState('')
  const [changed, setChanged]       = useState(false)

  if (!show || !warning) return null

  const roomId    = warning.roomId
  const roomSched = localCS || JSON.parse(JSON.stringify(classSchedules?.[roomId] || {}))
  const tSched    = localTS || JSON.parse(JSON.stringify(teacherSchedules || {}))

  // warning หลักยังมีคาบที่รอลงอยู่ถ้า placed < left
  const warningStillPending = warningPlacedCount < warning.left
  const allPending = [...(warningStillPending ? [warning] : []), ...pendingExtra]

  const emptySlots = []
  DAYS.forEach(d => PERIODS.forEach(p => { if (!roomSched[d]?.[p]) emptySlots.push({ day: d, period: p }) }))

  const options = useMemo(() => {
    if (!sel) return []
    const { day: td, period: tp } = sel
    const opts = []
    allPending.forEach(pend => {
      if (!tSched[pend.teacherId]?.[td]?.[tp]) {
        opts.push({ type: 'direct', icon: '📌', label: `ลง "${pend.subjectName}" โดยตรง`, detail: `${pend.teacherName} ว่างในเวลานี้`, pend })
      }
    })
    DAYS.forEach(day => PERIODS.forEach(period => {
      const slot = roomSched[day]?.[period]
      if (!slot || slot.subjectCode === 'SCOUT' || slot.subjectCode === 'FIXED') return
      if (day === td && period === tp) return
      const sTid = slot.teacher
      if (tSched[sTid]?.[td]?.[tp]) return
      allPending.forEach(pend => {
        if (tSched[pend.teacherId]?.[day]?.[period]) return
        opts.push({
          type: 'swap', icon: '🔄',
          label: `ย้าย "${slot.subject}" (${day} คาบ${period}) → (${td} คาบ${tp})`,
          detail: `แล้วลง "${pend.subjectName}" แทนที่ (${day} คาบ${period})`,
          fromDay: day, fromPeriod: period, toDay: td, toPeriod: tp,
          movingSlot: slot, movingTid: sTid, pend,
        })
      })
    }))
    return opts
  }, [sel, roomSched, tSched, allPending])

  function removeSlot(day, period) {
    const slot = roomSched[day]?.[period]
    if (!slot || slot.subjectCode === 'SCOUT' || slot.subjectCode === 'FIXED') return
    if (slot.preLocked) {
      setMsg('⛔ คาบนี้ถูกล็อคไว้ล่วงหน้า ไม่สามารถถอดออกได้')
      return
    }
    const newCS = JSON.parse(JSON.stringify(roomSched))
    const newTS = JSON.parse(JSON.stringify(tSched))
    delete newCS[day][period]
    if (slot.teacher && newTS[slot.teacher]?.[day]) delete newTS[slot.teacher][day][period]
    const isMainWarning = slot.subjectCode === warning.subjectCode && slot.teacher === warning.teacherId
    if (isMainWarning) {
      // คืน warning หลักกลับเข้า allPending โดยลด counter
      setWarningPlacedCount(prev => Math.max(0, prev - 1))
    } else {
      setPending(prev => [...prev, {
        teacherId: slot.teacher, teacherName: slot.teacherName,
        subjectCode: slot.subjectCode, subjectName: slot.subject,
        placed: 0, total: 1, left: 1, reason: '(ถอดออกด้วยตนเอง)',
      }])
    }
    setLocalCS(newCS); setLocalTS(newTS); setSel(null)
    setMsg(`🗑️ ถอด "${slot.subject}" ออกจากวัน${day} คาบ${period} แล้ว`); setChanged(true)
  }

  function applyOption(opt) {
    const newCS = JSON.parse(JSON.stringify(roomSched))
    const newTS = JSON.parse(JSON.stringify(tSched))
    const { pend } = opt
    if (opt.type === 'direct') {
      const { day, period } = sel
      newCS[day] = newCS[day] || {}
      newCS[day][period] = { subject: pend.subjectName, subjectCode: pend.subjectCode, teacher: pend.teacherId, teacherName: pend.teacherName }
      newTS[pend.teacherId] = newTS[pend.teacherId] || {}
      newTS[pend.teacherId][day] = newTS[pend.teacherId][day] || {}
      newTS[pend.teacherId][day][period] = { subject: pend.subjectName, subjectCode: pend.subjectCode, room: roomId }
      setMsg(`✅ ลง "${pend.subjectName}" วัน${day} คาบ${period} สำเร็จ`)
    } else if (opt.type === 'swap') {
      const { fromDay: fd, fromPeriod: fp, toDay: td, toPeriod: tp, movingSlot: ms, movingTid: mtid } = opt
      newCS[td] = newCS[td] || {}
      newCS[td][tp] = JSON.parse(JSON.stringify(newCS[fd][fp]))
      delete newCS[fd][fp]
      if (newTS[mtid]) {
        newTS[mtid][td] = newTS[mtid][td] || {}
        newTS[mtid][td][tp] = JSON.parse(JSON.stringify(newTS[mtid]?.[fd]?.[fp] || {}))
        if (newTS[mtid][fd]) delete newTS[mtid][fd][fp]
      }
      newCS[fd] = newCS[fd] || {}
      newCS[fd][fp] = { subject: pend.subjectName, subjectCode: pend.subjectCode, teacher: pend.teacherId, teacherName: pend.teacherName }
      if (newTS[pend.teacherId]) {
        newTS[pend.teacherId][fd] = newTS[pend.teacherId][fd] || {}
        newTS[pend.teacherId][fd][fp] = { subject: pend.subjectName, subjectCode: pend.subjectCode, room: roomId }
      }
      setMsg(`✅ ย้าย "${ms.subject}" และลง "${pend.subjectName}" สำเร็จ`)
    }
    const isWarningPend = pend.teacherId === warning.teacherId && pend.subjectCode === warning.subjectCode && pend.roomId === warning.roomId
    const isFromExtra = pendingExtra.find(p => p.teacherId === pend.teacherId && p.subjectCode === pend.subjectCode)
    if (isWarningPend && !isFromExtra) {
      // warning หลัก — เพิ่ม counter (ถ้าครบ left คาบจะหายจาก allPending)
      setWarningPlacedCount(prev => prev + 1)
    } else {
      setPending(prev => {
        const idx = prev.findIndex(p => p.subjectCode === pend.subjectCode && p.teacherId === pend.teacherId)
        return prev.filter((_, i) => i !== idx)
      })
    }
    setLocalCS(newCS); setLocalTS(newTS); setSel(null); setChanged(true)
  }

  function handleSave() {
    onApply && onApply(roomId, localCS || roomSched, localTS || tSched, warning)
  }

  function reset() {
    setLocalCS(null); setLocalTS(null); setSel(null); setMsg(''); setPending([]); setWarningPlacedCount(0); setChanged(false)
  }

  const subjectColor = (customColors[warning.subjectCode] || DEFAULT_SUBJECT_COLORS[warning.subjectCode])

  return (
    <div className="dm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dm-modal" style={{ maxWidth: 980 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="dm-header">
          <div>
            <div style={{ fontFamily: 'Kanit,sans-serif', fontWeight: 700, fontSize: '1.05rem' }}>
              <i className="bi bi-tools me-2" />จัดการ Manual — ห้อง {roomId}
            </div>
            <div style={{ fontSize: '0.76rem', opacity: 0.7, marginTop: 2 }}>
              คลิกคาบว่าง = เลือก target · คลิกคาบที่มีวิชา = ถอดออก
            </div>
          </div>
          <button className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <div className="dm-body" style={{ padding: '1rem' }}>

          {/* ── Alert วิชาที่มีปัญหา ───────────────────────────── */}
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2 p-2 rounded"
            style={{ background: '#fff8e1', border: '1px solid #ffe082', fontSize: '0.82rem' }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f9a825' }} />
            <strong>{warning.teacherName}</strong>
            <span style={{ color: '#888' }}>/</span>
            <span style={{
              padding: '1px 8px', borderRadius: 20, fontSize: '0.78rem',
              background: subjectColor?.bg || '#f0f0f0',
              border: `1px solid ${subjectColor?.border || '#ccc'}`,
              color: subjectColor?.text || '#333',
              fontWeight: 700,
            }}>{warning.subjectName}</span>
            <span style={{ color: '#888' }}>/</span>
            <strong>ห้อง {roomId}</strong>
            <span style={{ marginLeft: 4 }}>
              ลงได้ <strong>{warning.placed}/{warning.total}</strong> คาบ
              · ยังขาด <strong className="text-danger">{warning.left}</strong> คาบ
            </span>
            <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{warning.reason}</span>
            {pendingExtra.length > 0 && (
              <div className="d-flex align-items-center gap-1 ms-2 ps-2" style={{ borderLeft: '1px solid #ffe082' }}>
                <span style={{ fontSize: '0.73rem', color: '#888' }}>รอลงใหม่:</span>
                {pendingExtra.map((p, i) => (
                  <span key={i} style={{
                    fontSize: '0.72rem', padding: '1px 7px', borderRadius: 20,
                    background: getStyle(p.subjectCode, customColors).background,
                    border: `1px solid ${(customColors[p.subjectCode] || DEFAULT_SUBJECT_COLORS[p.subjectCode])?.border || '#ccc'}`,
                  }}>{p.subjectName}</span>
                ))}
              </div>
            )}
          </div>

          {msg && (
            <div className="rounded px-3 py-2 mb-2" style={{
              background: msg.startsWith('✅') ? '#e8f5e9' : '#fff8e1',
              border: `1px solid ${msg.startsWith('✅') ? '#a5d6a7' : '#ffe082'}`,
              fontSize: '0.82rem',
            }}>{msg}</div>
          )}

          {/* ══ ROW บน: ตารางห้อง + Panel ════════════════════════ */}
          <div className="row g-3 mb-3">

            {/* ── ตารางห้อง ─────────────────────────────────────── */}
            <div className="col-12 col-lg-8">
              <div style={{ fontFamily: 'Kanit,sans-serif', fontWeight: 600, fontSize: '0.87rem', marginBottom: 6, color: 'var(--primary)' }}>
                <i className="bi bi-grid me-1" />ตารางเรียน ห้อง {roomId}
                <span style={{ fontSize: '0.71rem', fontWeight: 400, color: '#888', marginLeft: 8 }}>
                  คาบว่าง = คลิกเลือก · คาบมีวิชา = คลิกถอดออก
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 440, fontSize: '0.73rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f4f8' }}>
                      <th style={{ padding: '4px 8px', border: '1px solid #ddd', minWidth: 50 }}>วัน</th>
                      {PERIODS.map(p => (
                        <th key={p} style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', minWidth: 82 }}>
                          คาบ{p}<br />
                          <span style={{ fontWeight: 400, fontSize: '0.6rem', color: '#aaa' }}>{PERIOD_TIMES[p]}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day}>
                        <td style={{ padding: '3px 8px', border: '1px solid #ddd', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                          {day === 'พุธ' && <span style={{ color: '#2e7d32' }}>●</span>} {day}
                        </td>
                        {PERIODS.map(period => {
                          const slot = roomSched[day]?.[period]
                          const isSel = sel?.day === day && sel?.period === period
                          const isFixed = slot?.subjectCode === 'SCOUT' || slot?.subjectCode === 'FIXED'
                          const st = slot ? getStyle(slot.subjectCode, customColors) : {}

                          if (!slot) {
                            return (
                              <td key={period} style={{ padding: 2, border: '1px solid #ddd', cursor: 'pointer' }}
                                onClick={() => { setSel({ day, period }); setMsg('') }}>
                                <div style={{
                                  minHeight: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: `2px ${isSel ? 'solid' : 'dashed'} ${isSel ? '#1976D2' : '#ef9a9a'}`,
                                  borderRadius: 6,
                                  background: isSel ? '#e3f2fd' : '#fff8f8',
                                  color: isSel ? '#1976D2' : '#ef9a9a',
                                  fontSize: '0.67rem', fontWeight: isSel ? 700 : 400,
                                }}>
                                  {isSel ? '✓ เลือก' : '+ ว่าง'}
                                </div>
                              </td>
                            )
                          }
                          if (isFixed) {
                            return (
                              <td key={period} style={{ padding: 2, border: '1px solid #ddd' }}>
                                <div style={{ ...st, borderRadius: 6, padding: '3px 5px', minHeight: 50, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: 0.7 }}>
                                  <div style={{ fontWeight: 700 }}>🏕️ {slot.subject}</div>
                                </div>
                              </td>
                            )
                          }
                          return (
                            <td key={period} style={{ padding: 2, border: '1px solid #ddd', cursor: slot.preLocked ? 'not-allowed' : 'pointer', position: 'relative' }}
                              onClick={() => removeSlot(day, period)}
                              title={slot.preLocked ? '🔒 ล็อคไว้ล่วงหน้า' : `คลิกเพื่อถอด "${slot.subject}" ออก`}>
                              <div style={{ ...st, borderRadius: 6, padding: '3px 5px', minHeight: 50, display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'filter 0.15s',
                                outline: slot.preLocked ? '2px solid #1976D2' : 'none' }}
                                onMouseEnter={e => { if(!slot.preLocked) e.currentTarget.style.filter = 'brightness(0.87)' }}
                                onMouseLeave={e => { e.currentTarget.style.filter = '' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.71rem' }}>
                                  {slot.preLocked && '🔒 '}{slot.subject}
                                </div>
                                <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>{slot.teacherName}</div>
                                {slot.preLocked
                                  ? <div style={{ fontSize: '0.57rem', color: '#1565C0', marginTop: 1 }}>ล็อคล่วงหน้า</div>
                                  : <div style={{ fontSize: '0.58rem', color: '#c62828', marginTop: 1, opacity: 0.8 }}>× ถอดออก</div>
                                }
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Panel ตัวเลือก ───────────────────────────────── */}
            <div className="col-12 col-lg-4">
              <div style={{ fontFamily: 'Kanit,sans-serif', fontWeight: 600, fontSize: '0.87rem', marginBottom: 6, color: 'var(--primary)' }}>
                <i className="bi bi-list-check me-1" />ตัวเลือก
              </div>

              {!sel ? (
                <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '1.2rem', textAlign: 'center', color: '#aaa', fontSize: '0.8rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>👆</div>
                  คลิก<span style={{ color: '#ef9a9a', fontWeight: 700 }}>คาบว่าง</span>เพื่อเลือก target<br />
                  <span style={{ fontSize: '0.72rem' }}>หรือ<span style={{ color: '#795548', fontWeight: 600 }}>คาบที่มีวิชา</span>เพื่อถอดออก</span>
                </div>
              ) : options.length === 0 ? (
                <div style={{ background: '#fff8f8', border: '1px solid #ffcdd2', borderRadius: 10, padding: '1rem', color: '#e57373', fontSize: '0.8rem' }}>
                  <i className="bi bi-x-circle me-1" />ไม่มีตัวเลือก<br />
                  <span style={{ fontSize: '0.71rem', color: '#aaa' }}>ครูที่เกี่ยวข้องติดคาบอื่นหมด<br />ลองถอดวิชาอื่นออกก่อน</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 2 }}>
                    เลือก: <strong>{sel.day} คาบ{sel.period}</strong>
                    <span style={{ fontSize: '0.68rem', color: '#aaa', marginLeft: 6 }}>({PERIOD_TIMES[sel.period]})</span>
                  </div>
                  {options.slice(0, 8).map((opt, i) => (
                    <button key={i} style={{
                      background: opt.type === 'direct' ? '#e8f5e9' : '#e3f2fd',
                      border: `1px solid ${opt.type === 'direct' ? '#a5d6a7' : '#90caf9'}`,
                      borderRadius: 8, padding: '7px 10px', fontSize: '0.75rem',
                      lineHeight: 1.4, textAlign: 'left', cursor: 'pointer', width: '100%',
                    }} onClick={() => applyOption(opt)}>
                      <div style={{ fontWeight: 700 }}>{opt.icon} {opt.label}</div>
                      <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 2 }}>{opt.detail}</div>
                    </button>
                  ))}
                  {options.length > 8 && (
                    <div style={{ fontSize: '0.68rem', color: '#aaa', textAlign: 'center' }}>+{options.length - 8} ตัวเลือกเพิ่มเติม</div>
                  )}
                </div>
              )}

              {/* คาบว่าง shortcuts */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#888', marginBottom: 5 }}>
                  คาบว่างในห้องนี้ ({emptySlots.length})
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {emptySlots.map((s, i) => (
                    <span key={i} style={{
                      background: sel?.day === s.day && sel?.period === s.period ? '#1976D2' : '#ffcdd2',
                      color: sel?.day === s.day && sel?.period === s.period ? '#fff' : '#c62828',
                      borderRadius: 6, padding: '2px 7px', fontSize: '0.69rem', cursor: 'pointer',
                    }} onClick={() => { setSel(s); setMsg('') }}>
                      {s.day} คาบ{s.period}
                    </span>
                  ))}
                  {emptySlots.length === 0 && <span style={{ fontSize: '0.75rem', color: '#4CAF50' }}>✓ ไม่มีคาบว่างแล้ว!</span>}
                </div>
              </div>

              {/* วิชารอลง — แสดงเสมอ */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#888', marginBottom: 5 }}>
                  วิชาที่รอลง ({allPending.length})
                </div>
                {allPending.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: '#4CAF50' }}>✓ ไม่มีวิชาที่รอลงแล้ว!</span>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {allPending.map((p, i) => (
                      <div key={i} style={{
                        fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6,
                        background: getStyle(p.subjectCode, customColors).background,
                        border: `1px solid ${(customColors[p.subjectCode] || DEFAULT_SUBJECT_COLORS[p.subjectCode])?.border || '#ccc'}`,
                      }}>
                        <strong>{p.subjectName}</strong>
                        <span style={{ color: '#888', marginLeft: 4, fontSize: '0.68rem' }}>({p.teacherName})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ ROW ล่าง: ตารางสอนครูประจำวิชา (full width) ══════ */}
          <div style={{ borderTop: '2px solid var(--border)', paddingTop: '0.9rem' }}>
            <div style={{ fontFamily: 'Kanit,sans-serif', fontWeight: 600, fontSize: '0.87rem', marginBottom: 8, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-person-badge me-1" />ตารางสอนครูประจำวิชา
              <span style={{ fontSize: '0.71rem', fontWeight: 400, color: '#888' }}>
                🟢 ● ว่าง+ห้อง = ลงได้ทันที · ○ ว่าง = ครูว่างแต่ห้องมีวิชาแล้ว · คลิกช่องว่างเพื่อเลือก target
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {[...new Map(allPending.map(p => [p.teacherId, p])).values()].map(pend => {
                const tsch = tSched[pend.teacherId] || {}
                const sc = (customColors[pend.subjectCode] || DEFAULT_SUBJECT_COLORS[pend.subjectCode])
                return (
                  <div key={pend.teacherId} style={{ flex: '1 1 400px', minWidth: 360 }}>
                    {/* ชื่อครู */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                      padding: '4px 10px',
                      background: sc?.bg || '#E3F2FD',
                      borderLeft: `4px solid ${sc?.border || '#1976D2'}`,
                      borderRadius: '0 6px 6px 0', fontSize: '0.82rem',
                    }}>
                      <div className="teacher-avatar" style={{ width: 26, height: 26, fontSize: '0.62rem', flexShrink: 0 }}>
                        {pend.teacherName.slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 700, color: sc?.text || '#0D47A1' }}>{pend.teacherName}</span>
                      <span style={{ fontSize: '0.72rem', color: '#888' }}>สอน{pend.subjectName}</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.69rem' }}>
                        <thead>
                          <tr style={{ background: '#f0f4f8' }}>
                            <th style={{ padding: '3px 6px', border: '1px solid #ddd', minWidth: 44 }}>วัน</th>
                            {PERIODS.map(p => (
                              <th key={p} style={{ padding: '3px 5px', border: '1px solid #ddd', textAlign: 'center', minWidth: 72 }}>
                                คาบ{p}
                                <div style={{ fontWeight: 400, fontSize: '0.57rem', color: '#aaa' }}>{PERIOD_TIMES[p]}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS.map(day => (
                            <tr key={day}>
                              <td style={{ padding: '2px 6px', border: '1px solid #ddd', fontWeight: 600, fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                                {day === 'พุธ' && <span style={{ color: '#2e7d32' }}>●</span>} {day}
                              </td>
                              {PERIODS.map(period => {
                                const slot = tsch[day]?.[period]
                                const isFixed = slot?.subjectCode === 'SCOUT' || slot?.subjectCode === 'FIXED'
                                const isFree = !slot
                                // ว่างทั้งครูและห้อง
                                const matchBoth = isFree && emptySlots.some(s => s.day === day && s.period === period)
                                const isSelTarget = sel?.day === day && sel?.period === period

                                if (isFree) {
                                  return (
                                    <td key={period} style={{ padding: 2, border: '1px solid #ddd', cursor: 'pointer' }}
                                      onClick={() => { setSel({ day, period }); setMsg('') }}
                                      title={`คลิกเลือก ${day} คาบ${period}`}>
                                      <div style={{
                                        minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 5, transition: 'all 0.1s',
                                        background: isSelTarget ? '#1565C0' : (matchBoth ? '#E8F5E9' : '#FAFAFA'),
                                        border: matchBoth
                                          ? `2px solid ${isSelTarget ? '#1565C0' : '#66BB6A'}`
                                          : `1px dashed ${isSelTarget ? '#1976D2' : '#ddd'}`,
                                        color: isSelTarget ? '#fff' : (matchBoth ? '#2E7D32' : '#bbb'),
                                        fontSize: '0.62rem', fontWeight: 600,
                                      }}>
                                        {isSelTarget ? '✓ เลือก' : (matchBoth ? '● ว่าง+ห้อง' : '○ ว่าง')}
                                      </div>
                                    </td>
                                  )
                                }

                                const st = getStyle(slot.subjectCode, customColors)
                                return (
                                  <td key={period} style={{ padding: 2, border: '1px solid #ddd' }}>
                                    <div style={{ ...st, borderRadius: 5, padding: '2px 4px', minHeight: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: isFixed ? 0.7 : 1 }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.65rem' }}>{isFixed ? '🏕️ ' : ''}{slot.subject}</div>
                                      {slot.room && slot.room !== '-' && (
                                        <div style={{ fontSize: '0.57rem', opacity: 0.75 }}>ห้อง {slot.room}</div>
                                      )}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>{/* end dm-body */}

        {/* ── Footer ─────────────────────────────────────────── */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <i className="bi bi-check-lg me-1" />บันทึกและปิด
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={reset}>
            <i className="bi bi-arrow-counterclockwise me-1" />รีเซ็ต
          </button>
          {emptySlots.length > 0 && (
            <span className="ms-auto" style={{ fontSize: '0.75rem', color: '#dc3545' }}>
              ⚠️ ยังมีคาบว่าง {emptySlots.length} คาบ
            </span>
          )}
          {emptySlots.length === 0 && changed && (
            <span className="ms-auto" style={{ fontSize: '0.75rem', color: '#4CAF50' }}>
              ✓ จัดการครบแล้ว พร้อมบันทึก
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
