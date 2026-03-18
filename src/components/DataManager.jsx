/**
 * DataManager.jsx v7 — Modal จัดการข้อมูลระบบ
 * Tabs: ห้องเรียน | ครูผู้สอน | มอบหมายสอน | วิชา+สี | Fix slots
 */
import { useState, useMemo, useEffect } from 'react'
import { DAYS, PERIODS, PERIOD_TIMES } from '../utils/mockData.js'
import { DEFAULT_SUBJECT_COLORS } from '../utils/subjectColors.js'

const SUBJECT_OPTIONS = [
  { code:'TH', name:'ภาษาไทย' },    { code:'MA', name:'คณิตศาสตร์' },
  { code:'SC', name:'วิทยาศาสตร์' },{ code:'SO', name:'สังคมศึกษา' },
  { code:'EN', name:'ภาษาอังกฤษ' }, { code:'PE', name:'พลศึกษา' },
  { code:'AR', name:'ศิลปะ' },       { code:'CO', name:'คอมพิวเตอร์' },
  { code:'HE', name:'สุขศึกษา' },   { code:'CR', name:'การงานอาชีพ' },
]

function Badge({ n }) {
  const bg = n > 25 ? '#dc3545' : n >= 20 ? '#fd7e14' : '#198754'
  return <span className="badge rounded-pill" style={{ background: bg, fontSize: '0.68rem', marginLeft: 4 }}>{n} คาบ</span>
}
function Saved() {
  return <span className="text-success ms-2" style={{ fontSize: '0.8rem' }}>✓ บันทึกแล้ว</span>
}
function SummaryBox({ rows }) {
  return (
    <div className="dm-summary-box mb-3">
      {rows.map(([label, value, color], i) => (
        <div key={i} className="dm-summary-row">
          <span style={{ color: '#666', fontSize: '0.83rem' }}>{label}</span>
          <strong style={{ fontSize: '0.83rem', color: color || '#333' }}>{value}</strong>
        </div>
      ))}
    </div>
  )
}

// ══ Tab: ห้องเรียน ══════════════════════════════════════════════
function RoomsTab({ gradeCode, roomCount, onUpdate }) {
  const [draft, setDraft] = useState(roomCount)
  const [saved, setSaved] = useState(false)
  const rooms = Array.from({ length: roomCount }, (_, i) => `${gradeCode}/${i+1}`)
  function save() {
    if (draft < 1 || draft > 12 || draft === roomCount) return
    onUpdate({ type: 'rooms', roomCount: draft })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-door-open me-2"/>ห้องเรียน</p>
      <SummaryBox rows={[
        ['ระดับชั้น', gradeCode],
        ['จำนวนห้องปัจจุบัน', `${roomCount} ห้อง`],
        ['รหัสห้องทั้งหมด', rooms.join(', ')],
      ]}/>
      <label className="dm-label mt-2">จำนวนห้องเรียน (1–12)</label>
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => setDraft(d=>Math.max(1,d-1))}>−</button>
        <input type="number" className="form-control form-control-sm text-center fw-bold" style={{width:72}}
          min={1} max={12} value={draft} onChange={e=>setDraft(Math.max(1,Math.min(12,+e.target.value)))}/>
        <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => setDraft(d=>Math.min(12,d+1))}>+</button>
      </div>
      {draft !== roomCount && <div className="alert alert-warning py-1 mb-2" style={{fontSize:'0.8rem'}}>⚠️ เปลี่ยนจำนวนห้องจะรีเซ็ตตาราง</div>}
      <button className="btn btn-primary btn-sm" onClick={save} disabled={draft===roomCount}>
        <i className="bi bi-check-lg me-1"/>บันทึก
      </button>
      {saved && <Saved/>}
    </div>
  )
}

// ══ Tab: ครูผู้สอน ══════════════════════════════════════════════
function TeachersTab({ teachers, onUpdate }) {
  const [list, setList]     = useState(teachers)
  const [mode, setMode]     = useState('list')
  const [editIdx, setEI]    = useState(null)
  const [form, setForm]     = useState({ teacherId:'', teacherName:'' })
  const [saved, setSaved]   = useState(false)

  const totalP = t => t.assignments.reduce((s,a)=>s+a.periodsPerWeek,0)
  function commit(nl) { setList(nl); onUpdate({type:'teachers',teachers:nl}); setSaved(true); setTimeout(()=>setSaved(false),1500) }
  function openAdd() { setForm({teacherId:`T${String(Date.now()).slice(-4)}`,teacherName:''}); setMode('add') }
  function openEdit(i) { setEI(i); setForm({teacherId:list[i].teacherId,teacherName:list[i].teacherName}); setMode('edit') }
  function handleSave() {
    if (!form.teacherName.trim()) return
    const nl = mode==='add'
      ? [...list,{teacherId:form.teacherId,teacherName:form.teacherName,assignments:[]}]
      : list.map((t,i)=>i===editIdx?{...t,...form}:t)
    commit(nl); setMode('list')
  }
  function del(i) { if (!window.confirm(`ลบ "${list[i].teacherName}"?`)) return; commit(list.filter((_,j)=>j!==i)) }

  const over = list.filter(t=>totalP(t)>25).length
  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-people me-2"/>ครูผู้สอน</p>
      <SummaryBox rows={[
        ['จำนวนครู', `${list.length} คน`],
        ['ครูเกิน 25 คาบ', `${over} คน`, over>0?'#dc3545':undefined],
      ]}/>
      {mode==='list' && <>
        <button className="btn btn-success btn-sm mb-2" onClick={openAdd}><i className="bi bi-plus-lg me-1"/>เพิ่มครู</button>
        {saved && <Saved/>}
        <div style={{maxHeight:310,overflowY:'auto',marginTop:8}}>
          {list.map((t,i) => (
            <div key={t.teacherId} className="dm-list-item">
              <div className="teacher-avatar" style={{width:32,height:32,fontSize:'0.7rem',flexShrink:0}}>{t.teacherName.slice(0,2)}</div>
              <div className="flex-grow-1" style={{minWidth:0}}>
                <div className="d-flex align-items-center flex-wrap gap-1">
                  <span style={{fontWeight:600,fontSize:'0.86rem'}}>{t.teacherName}</span>
                  <span style={{fontSize:'0.7rem',color:'#aaa'}}>({t.teacherId})</span>
                  <Badge n={totalP(t)}/>
                </div>
                <div style={{fontSize:'0.72rem',color:'#999',marginTop:2}}>
                  {t.assignments.length>0
                    ? `${t.assignments.length} assignment · ${[...new Set(t.assignments.map(a=>a.subjectName))].join(', ')}`
                    : <span className="text-warning">ยังไม่มีการมอบหมาย</span>}
                </div>
              </div>
              <div className="d-flex gap-1 flex-shrink-0">
                <button className="btn btn-sm btn-outline-primary py-0 px-2" onClick={()=>openEdit(i)}><i className="bi bi-pencil"/></button>
                <button className="btn btn-sm btn-outline-danger py-0 px-2" onClick={()=>del(i)}><i className="bi bi-trash"/></button>
              </div>
            </div>
          ))}
          {list.length===0 && <div className="text-center text-muted py-3">ยังไม่มีครู</div>}
        </div>
      </>}
      {(mode==='add'||mode==='edit') && (
        <div className="dm-form-card">
          <p style={{fontFamily:'Kanit,sans-serif',fontWeight:600,marginBottom:'0.75rem'}}>{mode==='add'?'➕ เพิ่มครูใหม่':'✏️ แก้ไขข้อมูลครู'}</p>
          <div className="dm-form-row"><label className="dm-label">รหัสครู</label>
            <input className="form-control form-control-sm" value={form.teacherId} onChange={e=>setForm(f=>({...f,teacherId:e.target.value}))}/></div>
          <div className="dm-form-row"><label className="dm-label">ชื่อ-นามสกุล</label>
            <input className="form-control form-control-sm" value={form.teacherName}
              placeholder="เช่น นายสมชาย ใจดี"
              onChange={e=>setForm(f=>({...f,teacherName:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&handleSave()}/></div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!form.teacherName.trim()}><i className="bi bi-check-lg me-1"/>บันทึก</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={()=>setMode('list')}>ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══ Tab: มอบหมายสอน ═════════════════════════════════════════════
function AssignTab({ teachers, gradeCode, roomCount, customSubjects, onUpdate }) {
  const [list, setList]     = useState(teachers)
  const [selId, setSelId]   = useState(teachers[0]?.teacherId||'')
  const [form, setForm]     = useState({roomId:`${gradeCode}/1`,subjectCode:'TH',subjectName:'ภาษาไทย',periodsPerWeek:3})
  const [editIdx, setEditIdx] = useState(null)
  const [err, setErr]       = useState('')
  const [saved, setSaved]   = useState(false)

  // sync เมื่อ teachers prop เปลี่ยน (เช่น หลัง import หรือแก้จาก Tab ครูผู้สอน)
  useEffect(() => {
    setList(teachers)
    if (!teachers.find(t => t.teacherId === selId)) {
      setSelId(teachers[0]?.teacherId || '')
    }
  }, [teachers])

  const rooms = Array.from({length:roomCount},(_,i)=>`${gradeCode}/${i+1}`)
  const teacher = list.find(t=>t.teacherId===selId)
  const totalP  = teacher ? teacher.assignments.reduce((s,a)=>s+a.periodsPerWeek,0) : 0

  // รวม built-in + custom subjects
  const allSubjectOptions = [
    ...SUBJECT_OPTIONS,
    ...(customSubjects||[]).filter(cs => !SUBJECT_OPTIONS.find(s => s.code===cs.code))
  ]

  function commit(nl) { setList(nl); onUpdate({type:'teachers',teachers:nl}); setSaved(true); setTimeout(()=>setSaved(false),1500) }
  function chgSubj(code) { const s=allSubjectOptions.find(x=>x.code===code); setForm(f=>({...f,subjectCode:code,subjectName:s?.name||code})) }

  function openEdit(idx) {
    const a = teacher.assignments[idx]
    setForm({roomId:a.roomId,subjectCode:a.subjectCode,subjectName:a.subjectName,periodsPerWeek:a.periodsPerWeek})
    setEditIdx(idx); setErr('')
  }
  function cancelEdit() { setEditIdx(null); setForm({roomId:`${gradeCode}/1`,subjectCode:'TH',subjectName:'ภาษาไทย',periodsPerWeek:3}); setErr('') }

  function save() {
    if (!teacher||!form.roomId) return
    if (form.periodsPerWeek<1||form.periodsPerWeek>10){setErr('คาบต้องอยู่ระหว่าง 1–10');return}
    // คำนวณ totalP โดยหักของเดิมออกก่อน (ถ้าอยู่ใน edit mode)
    const currentP = editIdx!==null ? totalP - teacher.assignments[editIdx].periodsPerWeek : totalP
    const np = currentP + form.periodsPerWeek
    if (np>25){setErr(`บันทึกแล้วครูจะมี ${np} คาบ — เกิน 25`);return}
    setErr('')
    if (editIdx !== null) {
      // แก้ไข
      commit(list.map(t=>t.teacherId===selId ? {
        ...t,
        assignments: t.assignments.map((a,i)=>i===editIdx ? {...form} : a)
      } : t))
      cancelEdit()
    } else {
      // เพิ่มใหม่
      commit(list.map(t=>t.teacherId===selId?{...t,assignments:[...t.assignments,{...form}]}:t))
    }
  }

  function remove(idx) {
    if (editIdx===idx) cancelEdit()
    commit(list.map(t=>t.teacherId===selId?{...t,assignments:t.assignments.filter((_,i)=>i!==idx)}:t))
  }
  function clearAll() { if (!window.confirm('ล้างการมอบหมายทั้งหมดของครูคนนี้?')) return; cancelEdit(); commit(list.map(t=>t.teacherId===selId?{...t,assignments:[]}:t)) }

  const isEditing = editIdx !== null

  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-journal-text me-2"/>มอบหมายการสอน</p>
      <div className="dm-form-row">
        <label className="dm-label">เลือกครู</label>
        <select className="form-select form-select-sm" value={selId} onChange={e=>{setSelId(e.target.value);cancelEdit();setErr('')}}>
          {list.map(t=><option key={t.teacherId} value={t.teacherId}>{t.teacherName} ({t.assignments.reduce((s,a)=>s+a.periodsPerWeek,0)} คาบ)</option>)}
        </select>
      </div>
      {teacher && <>
        <SummaryBox rows={[
          ['ครูที่เลือก', teacher.teacherName],
          ['ภาระงาน', `${totalP} คาบ`, totalP>25?'#dc3545':totalP>=20?'#fd7e14':'#198754'],
          ['ห้องที่รับผิดชอบ', [...new Set(teacher.assignments.map(a=>a.roomId))].join(', ')||'—'],
        ]}/>
        {/* progress bar */}
        <div className="mb-3">
          <div className="progress" style={{height:6}}>
            <div className="progress-bar" style={{width:`${Math.min(100,(totalP/30)*100)}%`,background:totalP>25?'#dc3545':totalP>=20?'#fd7e14':'#198754'}}/>
          </div>
        </div>
        <div className="table-responsive mb-2">
          <table className="table table-sm table-bordered mb-0" style={{fontSize:'0.81rem'}}>
            <thead style={{background:'#f0f4f8'}}>
              <tr><th>ห้อง</th><th>วิชา</th><th className="text-center">คาบ/อาทิตย์</th><th className="text-center" style={{width:80}}>จัดการ</th></tr>
            </thead>
            <tbody>
              {teacher.assignments.map((a,i)=>(
                <tr key={i} style={{background: editIdx===i ? '#fffde7' : ''}}>
                  <td><span className="badge" style={{background: editIdx===i ? '#f9a825' : 'var(--primary)',fontSize:'0.74rem'}}>{a.roomId}</span></td>
                  <td style={{fontSize:'0.79rem'}}>{a.subjectName}</td>
                  <td className="text-center fw-bold">{a.periodsPerWeek}</td>
                  <td className="text-center" style={{whiteSpace:'nowrap'}}>
                    <button className="btn btn-sm py-0 px-1 me-1"
                      style={{background: editIdx===i ? '#fff3cd' : '#e3f2fd', border:`1px solid ${editIdx===i?'#ffe082':'#90caf9'}`, fontSize:'0.72rem'}}
                      onClick={()=> editIdx===i ? cancelEdit() : openEdit(i)}
                      title={editIdx===i ? 'ยกเลิกแก้ไข' : 'แก้ไข'}>
                      <i className={`bi ${editIdx===i ? 'bi-x-lg' : 'bi-pencil'}`}/>
                    </button>
                    <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={()=>remove(i)} title="ลบ">
                      <i className="bi bi-trash"/>
                    </button>
                  </td>
                </tr>
              ))}
              {teacher.assignments.length===0&&<tr><td colSpan={4} className="text-center text-muted py-2">ยังไม่มีการมอบหมาย</td></tr>}
            </tbody>
          </table>
        </div>
        {teacher.assignments.length>0&&!isEditing&&<button className="btn btn-outline-danger btn-sm mb-3" onClick={clearAll}><i className="bi bi-trash me-1"/>ล้างทั้งหมด</button>}

        {/* Form เพิ่ม/แก้ไข */}
        <div className="p-2 rounded mb-2" style={{background: isEditing ? '#fffde7' : '#f8fafc', border:`1px solid ${isEditing ? '#ffe082' : 'var(--border)'}`}}>
          <p style={{fontFamily:'Kanit,sans-serif',fontWeight:600,fontSize:'0.87rem',marginBottom:'0.5rem',color: isEditing ? '#795548' : 'inherit'}}>
            {isEditing ? <><i className="bi bi-pencil-fill me-1" style={{color:'#f9a825'}}/>แก้ไขการมอบหมาย (แถวที่ {editIdx+1})</> : <>➕ เพิ่มการมอบหมายสอน</>}
          </p>
          <div className="row g-2 align-items-end">
            <div className="col-6 col-sm-3">
              <label className="dm-label">ห้อง</label>
              <select className="form-select form-select-sm" value={form.roomId} onChange={e=>setForm(f=>({...f,roomId:e.target.value}))}>
                {rooms.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-6 col-sm-4">
              <label className="dm-label">วิชา</label>
              <select className="form-select form-select-sm" value={form.subjectCode} onChange={e=>chgSubj(e.target.value)}>
                {allSubjectOptions.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-5 col-sm-3">
              <label className="dm-label">คาบ/อาทิตย์</label>
              <input type="number" className="form-control form-control-sm" min={1} max={10} value={form.periodsPerWeek}
                onChange={e=>setForm(f=>({...f,periodsPerWeek:+e.target.value}))}/>
            </div>
            <div className="col-7 col-sm-2 d-flex gap-1">
              <button className="btn btn-sm flex-grow-1"
                style={{background: isEditing ? '#f9a825' : '#198754', color:'#fff', fontWeight:600}}
                onClick={save}>
                <i className={`bi ${isEditing ? 'bi-check-lg' : 'bi-plus-lg'} me-1`}/>
                {isEditing ? 'บันทึก' : 'เพิ่ม'}
              </button>
              {isEditing && (
                <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} title="ยกเลิก">
                  <i className="bi bi-x-lg"/>
                </button>
              )}
            </div>
          </div>
          {err&&<div className="alert alert-danger py-1 mt-2" style={{fontSize:'0.79rem'}}>{err}</div>}
        </div>
        {saved&&<Saved/>}
      </>}
    </div>
  )
}


// ══ Tab: ไม่ว่าง (Teacher Unavailable) ══════════════════════════
function UnavailableTab({ teachers, fixedSlots, teacherUnavailable, roomPeriods, onUpdate }) {
  const [list, setList]     = useState(teacherUnavailable)
  const [selTId, setSelTId] = useState(teachers[0]?.teacherId || '')
  const [reason, setReason] = useState('')
  const teacher = teachers.find(t => t.teacherId === selTId)
  const busyMap = {}
  list.filter(u => u.teacherId === selTId).forEach(u => { busyMap[`${u.day}__${u.period}`] = u.reason || '' })
  const fixedSet = new Set(fixedSlots.map(fs => `${fs.day}__${fs.period}`))
  function commit(newList) { setList(newList); onUpdate({ type: 'unavailable', teacherUnavailable: newList }) }
  function toggleSlot(day, period) {
    const k = `${day}__${period}`
    if (fixedSet.has(k)) return
    if (busyMap[k] !== undefined) {
      commit(list.filter(u => !(u.teacherId === selTId && u.day === day && u.period === period)))
    } else {
      commit([...list, { teacherId: selTId, teacherName: teacher.teacherName, day, period, reason: reason.trim() || 'ไม่ว่าง' }])
    }
  }
  function updateReason(day, period, newReason) {
    commit(list.map(u => u.teacherId === selTId && u.day === day && u.period === period ? { ...u, reason: newReason } : u))
  }
  const totalBusy = list.filter(u => u.teacherId === selTId).length

  // dynPeriods: global max ของทุกห้อง ทุกวัน
  function dynPeriods() {
    if (!roomPeriods || Object.keys(roomPeriods).length === 0) return PERIODS
    const allVals = Object.values(roomPeriods).flatMap(dp => DAYS.map(d => dp[d] ?? PERIODS.length))
    const maxP = Math.max(PERIODS.length, ...allVals)
    return Array.from({ length: maxP }, (_, i) => i + 1)
  }
  const periodList = dynPeriods()

  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-calendar-x me-2"/>ตารางไม่ว่างของครู</p>
      <SummaryBox rows={[
        ['วิธีใช้', 'เลือกครู → คลิกคาบที่ไม่ว่าง → แก้เหตุผลได้ในช่อง'],
        ['ผล', 'Random จะไม่ลงวิชาในคาบที่ครูไม่ว่าง'],
        ['รวมทั้งหมด', `${list.length} รายการ`],
      ]}/>
      <div className="row g-2 mb-3 align-items-end">
        <div className="col-8">
          <label className="dm-label">ครูผู้สอน</label>
          <select className="form-select form-select-sm" value={selTId} onChange={e => setSelTId(e.target.value)}>
            {teachers.map(t => {
              const n = list.filter(u => u.teacherId === t.teacherId).length
              return <option key={t.teacherId} value={t.teacherId}>{t.teacherName}{n > 0 ? ` (🚫 ${n} คาบ)` : ''}</option>
            })}
          </select>
        </div>
        <div className="col-4">
          {totalBusy > 0 && (
            <button className="btn btn-sm btn-outline-danger w-100"
              onClick={() => commit(list.filter(u => u.teacherId !== selTId))}>
              <i className="bi bi-trash me-1"/>ล้างทั้งหมด
            </button>
          )}
        </div>
      </div>
      <div className="mb-3">
        <label className="dm-label">เหตุผลเริ่มต้น (กรอกก่อนคลิกคาบ)</label>
        <input className="form-control form-control-sm" placeholder="เช่น ประชุม / ลาพัก / ติดสอน"
          value={reason} onChange={e => setReason(e.target.value)}/>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.74rem' }}>
          <thead>
            <tr style={{ background: '#f0f4f8' }}>
              <th style={{ padding: '4px 8px', border: '1px solid #ddd', minWidth: 55 }}>วัน</th>
              {periodList.map(p => (
                <th key={p} style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', minWidth: 94 }}>
                  คาบ {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day}>
                <td style={{ padding: '3px 8px', border: '1px solid #ddd', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{day}</td>
                {periodList.map(period => {
                  const k = `${day}__${period}`
                  const isFixed = fixedSet.has(k)
                  const isBusy  = busyMap[k] !== undefined
                  if (isFixed) {
                    const fs = fixedSlots.find(f => f.day === day && f.period === period)
                    return (
                      <td key={period} style={{ padding: 2, border: '1px solid #ddd' }}>
                        <div style={{ minHeight: 48, borderRadius: 6, background: '#f1f8e9', border: '1px solid #a5d6a7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.63rem', color: '#388e3c', fontWeight: 600 }}>
                          🏕️ {fs?.subjectName}
                        </div>
                      </td>
                    )
                  }
                  if (isBusy) {
                    return (
                      <td key={period} style={{ padding: 2, border: '1px solid #ddd' }}>
                        <div style={{ minHeight: 48, borderRadius: 6, background: '#FFF3E0', border: '2px solid #E65100', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px 4px', gap: 2 }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#BF360C' }}>🚫 ไม่ว่าง</div>
                          <input style={{ width: '90%', fontSize: '0.59rem', border: '1px solid #ffccbc', borderRadius: 3, background: '#fff8f5', textAlign: 'center', color: '#888', outline: 'none', padding: '1px 3px' }}
                            value={busyMap[k]} placeholder="เหตุผล..."
                            onChange={e => updateReason(day, period, e.target.value)}
                            onClick={e => e.stopPropagation()}/>
                          <button style={{ fontSize: '0.55rem', background: 'none', border: 'none', color: '#E65100', cursor: 'pointer' }}
                            onClick={() => toggleSlot(day, period)}>× ยกเลิก</button>
                        </div>
                      </td>
                    )
                  }
                  return (
                    <td key={period} style={{ padding: 2, border: '1px solid #ddd', cursor: 'pointer' }}
                      onClick={() => toggleSlot(day, period)}>
                      <div style={{ minHeight: 48, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e0e0e0', color: '#ddd', fontSize: '0.63rem', transition: 'all 0.1s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fff8f0'; e.currentTarget.style.borderColor = '#E65100'; e.currentTarget.style.color = '#E65100' }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#ddd' }}>
                        + ไม่ว่าง
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalBusy > 0 && (
        <div className="mt-3">
          <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#E65100', marginBottom: 5 }}>🚫 คาบที่ไม่ว่างของ {teacher?.teacherName} ({totalBusy} คาบ)</div>
          <div className="d-flex flex-wrap gap-1">
            {list.filter(u => u.teacherId === selTId).map((u, i) => (
              <span key={i} style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.71rem', background: '#FFF3E0', border: '1px solid #E65100', color: '#BF360C', fontWeight: 600 }}>
                {u.day} คาบ{u.period}{u.reason ? ` — ${u.reason}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══ Tab: วิชา + สี (พร้อมเพิ่ม/ลบวิชา) ══════════════════════════
function SubjectsColorTab({ teachers, gradeCode, roomCount, customColors, onUpdate }) {
  const rooms = Array.from({ length: roomCount }, (_, i) => `${gradeCode}/${i+1}`)
  const [colors, setColors]   = useState({ ...DEFAULT_SUBJECT_COLORS, ...customColors })
  const [saved, setSaved]     = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newBg,   setNewBg]   = useState('#E3F2FD')
  const [newBd,   setNewBd]   = useState('#1565C0')
  const [newTx,   setNewTx]   = useState('#0D47A1')
  const [addErr,  setAddErr]  = useState('')

  const subjMap = useMemo(() => {
    const m = {}
    teachers.forEach(t => t.assignments.forEach(a => {
      if (!m[a.subjectCode]) m[a.subjectCode] = { name: a.subjectName, code: a.subjectCode, teachers: new Set(), rooms: new Map() }
      m[a.subjectCode].teachers.add(t.teacherName)
      m[a.subjectCode].rooms.set(a.roomId, a.periodsPerWeek)
    }))
    return m
  }, [teachers])

  const systemCodes  = new Set(['SCOUT', 'FREE', 'BUSY'])
  const allSubjCodes = [...new Set([
    ...Object.keys(subjMap),
    ...Object.keys(colors).filter(c => !systemCodes.has(c))
  ])]
  const totalAssigned = teachers.reduce((s, t) => s + t.assignments.reduce((ss, a) => ss + a.periodsPerWeek, 0), 0)
  const targetTotal   = rooms.length * 24

  function updateColor(code, field, val) { setColors(c => ({ ...c, [code]: { ...c[code], [field]: val } })) }
  function saveColors() { onUpdate({ type: 'colors', colors }); setSaved(true); setTimeout(() => setSaved(false), 1500) }

  function addSubject() {
    setAddErr('')
    const code = newCode.trim().toUpperCase()
    const name = newName.trim()
    if (!code) { setAddErr('กรุณากรอกรหัสวิชา'); return }
    if (!name) { setAddErr('กรุณากรอกชื่อวิชา');  return }
    if (!/^[A-Z0-9_]+$/.test(code)) { setAddErr('รหัสวิชาใช้ได้เฉพาะ A-Z 0-9 _'); return }
    if (colors[code]) { setAddErr(`รหัส ${code} มีอยู่แล้ว`); return }
    const newColors = { ...colors, [code]: { bg: newBg, border: newBd, text: newTx, label: name } }
    setColors(newColors)
    onUpdate({ type: 'colors', colors: newColors })
    onUpdate({ type: 'addSubject', subjectCode: code, subjectName: name })
    setNewCode(''); setNewName('')
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  function removeSubject(code) {
    const displayName = colors[code]?.label || subjMap[code]?.name || code
    const hasAssign = !!subjMap[code]
    if (hasAssign) {
      const assignList = [...subjMap[code].rooms.keys()].join(', ')
      if (!window.confirm(`⚠️ ลบวิชา "${displayName}" ออก?\n\nวิชานี้ยังมีการมอบหมายสอนอยู่ในห้อง: ${assignList}\n\nการลบจะนำ assignment ทั้งหมดออกด้วย`)) return
      // ลบ assignments ของวิชานี้ออกจากครูทุกคน
      const newTeachers = teachers.map(t => ({
        ...t,
        assignments: t.assignments.filter(a => a.subjectCode !== code)
      }))
      onUpdate({ type: 'teachers', teachers: newTeachers })
    } else {
      if (!window.confirm(`ลบวิชา "${displayName}" ออก?`)) return
    }
    const newColors = { ...colors }; delete newColors[code]
    setColors(newColors)
    onUpdate({ type: 'colors', colors: newColors })
    onUpdate({ type: 'removeSubject', subjectCode: code })
  }

  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-palette me-2"/>สรุปวิชา & กำหนดสี</p>
      <SummaryBox rows={[
        ['จำนวนวิชา', `${allSubjCodes.length} วิชา`],
        ['คาบที่มอบหมาย', `${totalAssigned} คาบ`],
        ['เป้าหมาย', `${targetTotal} คาบ (${rooms.length}ห้อง×24คาบ)`, totalAssigned < targetTotal ? '#dc3545' : '#198754'],
      ]}/>
      <div className="table-responsive mb-2">
        <table className="table table-sm table-bordered" style={{ fontSize: '0.79rem' }}>
          <thead style={{ background: '#f0f4f8' }}>
            <tr><th>รหัส</th><th>ชื่อวิชา</th><th>ห้องที่สอน</th><th style={{minWidth:70}}>พื้นหลัง</th><th style={{minWidth:70}}>ขอบ</th><th style={{minWidth:60}}>Preview</th><th></th></tr>
          </thead>
          <tbody>
            {allSubjCodes.map(code => {
              const info    = subjMap[code]
              const missing = info ? rooms.filter(r => !info.rooms.has(r)) : []
              const c = colors[code] || DEFAULT_SUBJECT_COLORS[code] || { bg: '#f5f5f5', border: '#bbb', text: '#333' }
              const displayName = c.label || info?.name || code
              return (
                <tr key={code}>
                  <td><code style={{ fontSize: '0.7rem', background: '#f0f4f8', padding: '1px 4px', borderRadius: 3 }}>{code}</code></td>
                  <td style={{ fontWeight: 600 }}>
                    {displayName}
                    {!info && <span className="ms-1 badge" style={{ background: '#e3f2fd', color: '#1565C0', fontSize: '0.58rem' }}>custom</span>}
                    {info && <span className="ms-1 badge" style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: '0.58rem' }}>{[...subjMap[code].rooms.keys()].length} ห้อง</span>}
                  </td>
                  <td style={{ fontSize: '0.72rem' }}>
                    {info ? (missing.length > 0
                      ? <span className="text-danger fw-bold">ห้อง {missing.map(r => r.split('/')[1]).join(',')}</span>
                      : <span className="text-success">✓</span>)
                      : <span className="text-muted">—</span>}
                  </td>
                  <td><input type="color" className="form-control form-control-sm p-0" style={{ height: 26, cursor: 'pointer' }} value={c.bg} onChange={e => updateColor(code, 'bg', e.target.value)}/></td>
                  <td><input type="color" className="form-control form-control-sm p-0" style={{ height: 26, cursor: 'pointer' }} value={c.border} onChange={e => updateColor(code, 'border', e.target.value)}/></td>
                  <td>
                    <div style={{ background: c.bg, borderLeft: `4px solid ${c.border}`, color: c.text, borderRadius: 4, padding: '2px 5px', fontSize: '0.67rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {displayName}
                    </div>
                  </td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => removeSubject(code)}
                      title={info ? `ลบวิชา (มี assignment ${[...subjMap[code].rooms.keys()].length} ห้อง)` : 'ลบวิชา'}>
                      <i className="bi bi-trash" style={{ fontSize: '0.7rem' }}/>
                    </button>
                  </td>
                </tr>
              )
            })}
            {allSubjCodes.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-2">ยังไม่มีวิชา</td></tr>}
          </tbody>
        </table>
      </div>
      <button className="btn btn-primary btn-sm me-2" onClick={saveColors}><i className="bi bi-palette me-1"/>บันทึกสีทั้งหมด</button>
      {saved && <Saved/>}
      <hr className="my-3"/>
      <p style={{ fontFamily: 'Kanit,sans-serif', fontWeight: 600, fontSize: '0.87rem', marginBottom: '0.5rem' }}>
        <i className="bi bi-plus-circle me-1 text-success"/>เพิ่มวิชาใหม่
      </p>
      <div className="row g-2 align-items-end">
        <div className="col-6 col-md-2">
          <label className="dm-label">รหัสวิชา</label>
          <input className="form-control form-control-sm" placeholder="เช่น MU" style={{ textTransform: 'uppercase' }}
            value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}/>
        </div>
        <div className="col-6 col-md-3">
          <label className="dm-label">ชื่อวิชา</label>
          <input className="form-control form-control-sm" placeholder="เช่น ดนตรี"
            value={newName} onChange={e => setNewName(e.target.value)}/>
        </div>
        <div className="col-4 col-md-2">
          <label className="dm-label">สีพื้นหลัง</label>
          <input type="color" className="form-control form-control-sm p-0" style={{ height: 31, cursor: 'pointer' }} value={newBg} onChange={e => setNewBg(e.target.value)}/>
        </div>
        <div className="col-4 col-md-2">
          <label className="dm-label">สีขอบ+ตัวหนังสือ</label>
          <input type="color" className="form-control form-control-sm p-0" style={{ height: 31, cursor: 'pointer' }} value={newBd} onChange={e => { setNewBd(e.target.value); setNewTx(e.target.value) }}/>
        </div>
        <div className="col-4 col-md-1">
          <label className="dm-label">Preview</label>
          <div style={{ background: newBg, border: `2px solid ${newBd}`, color: newTx, borderRadius: 6, height: 31, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.67rem', fontWeight: 700 }}>
            {newName || newCode || '?'}
          </div>
        </div>
        <div className="col-12 col-md-2">
          <button className="btn btn-success btn-sm w-100" onClick={addSubject}><i className="bi bi-plus-lg me-1"/>เพิ่มวิชา</button>
        </div>
      </div>
      {addErr && <div className="alert alert-danger py-1 mt-2" style={{ fontSize: '0.79rem' }}>{addErr}</div>}
      <div style={{ fontSize: '0.73rem', color: '#888', marginTop: 6 }}>💡 วิชาที่เพิ่มจะปรากฏในตัวเลือก "มอบหมายสอน" ด้วย</div>
    </div>
  )
}


// ══ Tab: Fix Slots ══════════════════════════════════════════════
function FixedTab({ fixedSlots, onUpdate }) {
  const [slots, setSlots] = useState(fixedSlots)
  const [form, setForm]   = useState({subjectName:'ลูกเสือ',subjectCode:`SCOUT${Math.random()}`,day:'พุธ',period:5})
  const [err, setErr]     = useState('')
  const [saved, setSaved] = useState(false)

  function commit(ns) { setSlots(ns); onUpdate({type:'fixed',fixedSlots:ns}); setSaved(true); setTimeout(()=>setSaved(false),1500) }
  function add() {
    if (!form.subjectName.trim()){setErr('กรุณากรอกชื่อวิชา');return}
    if (slots.find(s=>s.day===form.day&&s.period===form.period)){setErr(`วัน${form.day} คาบ${form.period} มีอยู่แล้ว`);return}
    setErr(''); commit([...slots,{...form}])
  }
  function remove(i) { commit(slots.filter((_,j)=>j!==i)) }

  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-pin-angle-fill me-2"/>วิชาที่ Fix ตายตัว</p>
      <SummaryBox rows={[
        ['จำนวน Fix slots', `${slots.length} รายการ`],
        ['คาบที่ถูกล็อค', slots.length>0?slots.map(s=>`${s.day} คาบ${s.period}`).join(', '):'—'],
      ]}/>
      <div className="table-responsive mb-3">
        <table className="table table-sm table-bordered mb-0" style={{fontSize:'0.82rem'}}>
          <thead style={{background:'#f0f4f8'}}>
            <tr><th>วิชา</th><th>วัน</th><th className="text-center">คาบ</th><th>เวลา</th><th></th></tr>
          </thead>
          <tbody>
            {slots.map((s,i)=>(
              <tr key={i}>
                <td><span style={{background:'#e8f5e9',color:'#2e7d32',borderRadius:4,padding:'1px 6px',fontSize:'0.75rem'}}>🏕️ {s.subjectName}</span></td>
                <td>{s.day}</td><td className="text-center">คาบ {s.period}</td>
                <td style={{color:'#888',fontSize:'0.74rem'}}>{PERIOD_TIMES[s.period]}</td>
                <td className="text-center"><button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={()=>remove(i)}><i className="bi bi-trash"/></button></td>
              </tr>
            ))}
            {slots.length===0&&<tr><td colSpan={5} className="text-center text-muted py-2">ยังไม่มีวิชา Fix</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{fontFamily:'Kanit,sans-serif',fontWeight:600,fontSize:'0.87rem',marginBottom:'0.5rem'}}>➕ เพิ่ม Fix slot</p>
      <div className="row g-2 align-items-end">
        <div className="col-12 col-sm-4"><label className="dm-label">ชื่อวิชา</label>
          <input className="form-control form-control-sm" value={form.subjectName} onChange={e=>setForm(f=>({...f,subjectName:e.target.value}))} placeholder="เช่น ลูกเสือ"/></div>
        <div className="col-6 col-sm-3"><label className="dm-label">วัน</label>
          <select className="form-select form-select-sm" value={form.day} onChange={e=>setForm(f=>({...f,day:e.target.value}))}>
            {DAYS.map(d=><option key={d}>{d}</option>)}</select></div>
        <div className="col-6 col-sm-3"><label className="dm-label">คาบ</label>
          <select className="form-select form-select-sm" value={form.period} onChange={e=>setForm(f=>({...f,period:+e.target.value}))}>
            {PERIODS.map(p=><option key={p} value={p}>คาบ {p} ({PERIOD_TIMES[p]})</option>)}</select></div>
        <div className="col-12 col-sm-2"><button className="btn btn-success btn-sm w-100" onClick={add}><i className="bi bi-plus-lg me-1"/>เพิ่ม</button></div>
      </div>
      {err&&<div className="alert alert-danger py-1 mt-2" style={{fontSize:'0.79rem'}}>{err}</div>}
      {saved&&<Saved/>}
    </div>
  )
}

// ══ MAIN ════════════════════════════════════════════════════════
// ══ Tab: ล็อคคาบล่วงหน้า ════════════════════════════════════════
function PreLockTab({ teachers, gradeCode, roomCount, preLocks, fixedSlots, customColors, roomPeriods, onUpdate }) {
  const [selTId, setSelTId] = useState(teachers[0]?.teacherId || '')
  const [selRoom, setSelRoom] = useState(`${gradeCode}/1`)
  const [selSubj, setSelSubj] = useState(null)   // assignment ที่เลือก (สำหรับจะลง)
  const [locks, setLocks]    = useState(preLocks) // [{teacherId,teacherName,roomId,subjectCode,subjectName,day,period}]

  const rooms = Array.from({length:roomCount}, (_,i) => `${gradeCode}/${i+1}`)
  const teacher = teachers.find(t => t.teacherId === selTId)

  // assignments ของครูคนนี้ ที่ตรงกับห้องที่เลือก
  const roomAssignments = teacher?.assignments.filter(a => a.roomId === selRoom) || []

  // นับว่า assignment นี้ lock ไปแล้วกี่คาบ
  function lockedCount(subjectCode) {
    return locks.filter(l => l.teacherId === selTId && l.roomId === selRoom && l.subjectCode === subjectCode).length
  }

  // lock map สำหรับแสดงใน grid
  const lockSet = new Set(locks.map(l => `${l.teacherId}__${l.roomId}__${l.day}__${l.period}`))
  const teacherBusy = new Set(locks.filter(l=>l.teacherId===selTId).map(l=>`${l.day}__${l.period}`))
  // fixed slots ก็นับด้วย
  fixedSlots.forEach(fs => teacherBusy.add(`${fs.day}__${fs.period}`))

  // ตารางสอนครูที่ล็อคแล้วทั้งหมด (ทุกห้อง) เพื่อเช็คว่าครูว่างไหม
  const allTeacherLocks = locks.filter(l => l.teacherId === selTId)

  function toggleLock(day, period) {
    if (!selSubj) return
    const k = `${selTId}__${selRoom}__${day}__${period}`
    const alreadyLocked = lockSet.has(k)

    if (alreadyLocked) {
      // unlock
      const newLocks = locks.filter(l => !(l.teacherId===selTId && l.roomId===selRoom && l.day===day && l.period===period))
      setLocks(newLocks)
      onUpdate({ type:'prelocks', preLocks: newLocks })
    } else {
      // ตรวจสอบก่อนล็อค
      const teacherSlotBusy = teacherBusy.has(`${day}__${period}`)
      const roomSlotBusy = locks.some(l => l.roomId===selRoom && l.day===day && l.period===period)
      if (teacherSlotBusy) { alert(`ครู ${teacher.teacherName} ติดคาบนี้อยู่แล้ว`); return }
      if (roomSlotBusy) { alert(`ห้อง ${selRoom} มีวิชาลงในคาบนี้แล้ว`); return }

      // เช็คว่าล็อคครบแล้วหรือยัง
      const needed = selSubj.periodsPerWeek
      const done = lockedCount(selSubj.subjectCode)
      if (done >= needed) { alert(`${selSubj.subjectName} ในห้อง ${selRoom} ล็อคครบ ${needed} คาบแล้ว`); return }

      const newLock = { teacherId:selTId, teacherName:teacher.teacherName, roomId:selRoom, subjectCode:selSubj.subjectCode, subjectName:selSubj.subjectName, day, period }
      const newLocks = [...locks, newLock]
      setLocks(newLocks)
      onUpdate({ type:'prelocks', preLocks: newLocks })
    }
  }

  // คาบของห้องที่เลือก ในวันนั้น (สำหรับ body แต่ละแถว)
  function getPeriodsForRoomDay(roomId, day) {
    const dayMap = roomPeriods?.[roomId]
    const maxP = dayMap ? (dayMap[day] ?? PERIODS.length) : PERIODS.length
    return Array.from({ length: maxP }, (_, i) => i + 1)
  }
  // max period ของห้องที่เลือก (ทุกวัน) สำหรับ header
  function getMaxPeriodsForRoom(roomId) {
    const dayMap = roomPeriods?.[roomId]
    if (!dayMap) return PERIODS.length
    return Math.max(PERIODS.length, ...DAYS.map(d => dayMap[d] ?? PERIODS.length))
  }
  const headerPeriodList = Array.from({ length: getMaxPeriodsForRoom(selRoom) }, (_, i) => i + 1)

  function clearRoomLocks() {
    const newLocks = locks.filter(l => !(l.teacherId===selTId && l.roomId===selRoom))
    setLocks(newLocks); onUpdate({ type:'prelocks', preLocks: newLocks })
  }
  function clearAllLocks() {
    if (!window.confirm('ล้างการล็อคคาบทั้งหมด?')) return
    setLocks([]); onUpdate({ type:'prelocks', preLocks: [] })
  }

  const allColors = { ...DEFAULT_SUBJECT_COLORS, ...customColors }
  const totalLocks = locks.length

  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-lock-fill me-2"/>ล็อคคาบล่วงหน้า</p>
      <SummaryBox rows={[
        ['คาบที่ล็อคไว้ทั้งหมด', `${totalLocks} คาบ`],
        ['วิธีใช้', 'เลือกครู → เลือกห้อง → เลือกวิชา → คลิกคาบในตาราง'],
      ]}/>

      {/* เลือกครู + ห้อง */}
      <div className="row g-2 mb-3">
        <div className="col-7">
          <label className="dm-label">ครูผู้สอน</label>
          <select className="form-select form-select-sm" value={selTId}
            onChange={e => { setSelTId(e.target.value); setSelSubj(null) }}>
            {teachers.map(t => <option key={t.teacherId} value={t.teacherId}>{t.teacherName}</option>)}
          </select>
        </div>
        <div className="col-5">
          <label className="dm-label">ห้องเรียน</label>
          <select className="form-select form-select-sm" value={selRoom}
            onChange={e => { setSelRoom(e.target.value); setSelSubj(null) }}>
            {rooms.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* เลือกวิชาที่จะล็อค */}
      {roomAssignments.length > 0 ? (
        <div className="mb-3">
          <label className="dm-label">เลือกวิชาที่ต้องการล็อคคาบ</label>
          <div className="d-flex flex-wrap gap-2 mt-1">
            {roomAssignments.map(a => {
              const done = lockedCount(a.subjectCode)
              const isSel = selSubj?.subjectCode === a.subjectCode
              const isFull = done >= a.periodsPerWeek
              const c = allColors[a.subjectCode]
              return (
                <button key={a.subjectCode}
                  onClick={() => setSelSubj(isSel ? null : a)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                    cursor: isFull ? 'default' : 'pointer',
                    background: isSel ? (c?.border || '#1976D2') : (c?.bg || '#f0f0f0'),
                    color: isSel ? '#fff' : (c?.text || '#333'),
                    border: `2px solid ${isSel ? (c?.border || '#1976D2') : (isFull ? '#a5d6a7' : (c?.border || '#ccc'))}`,
                    opacity: isFull ? 0.7 : 1,
                  }}>
                  {a.subjectName}
                  <span style={{ marginLeft: 6, fontSize: '0.7rem', opacity: 0.85 }}>
                    {done}/{a.periodsPerWeek} คาบ {isFull ? '✓' : ''}
                  </span>
                </button>
              )
            })}
          </div>
          {selSubj && (
            <div className="mt-2 px-2 py-1 rounded" style={{ background: '#e3f2fd', fontSize: '0.78rem', color: '#1565C0' }}>
              <i className="bi bi-info-circle me-1"/>
              คลิกคาบว่าง (สีเขียว) ในตารางด้านล่างเพื่อล็อค "{selSubj.subjectName}" · คลิกซ้ำเพื่อยกเลิก
            </div>
          )}
        </div>
      ) : (
        <div className="alert py-2 mb-3" style={{ background: '#fff8e1', border: '1px solid #ffe082', fontSize: '0.81rem', borderRadius: 8 }}>
          <i className="bi bi-exclamation-triangle me-2" style={{ color: '#f9a825' }}/>
          ครูคนนี้ไม่ได้รับมอบหมายสอนในห้อง {selRoom}
        </div>
      )}

      {/* Grid ตาราง */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.74rem' }}>
          <thead>
            <tr style={{ background: '#f0f4f8' }}>
              <th style={{ padding: '4px 8px', border: '1px solid #ddd', minWidth: 50 }}>วัน</th>
              {headerPeriodList.map(p => (
                <th key={p} style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', minWidth: 86 }}>
                  คาบ {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day}>
                <td style={{ padding:'3px 8px', border:'1px solid #ddd', fontWeight:600, fontSize:'0.72rem', whiteSpace:'nowrap' }}>
                  {day==='พุธ' && <span style={{color:'#2e7d32'}}>●</span>} {day}
                </td>
                {getPeriodsForRoomDay(selRoom, day).map(period => {
                  const lockHere = locks.find(l => l.teacherId===selTId && l.roomId===selRoom && l.day===day && l.period===period)
                  const teacherBusyHere = !lockHere && (teacherBusy.has(`${day}__${period}`) || allTeacherLocks.some(l => l.day===day && l.period===period && l.roomId!==selRoom))
                  const roomBusyHere = !lockHere && locks.some(l => l.roomId===selRoom && l.day===day && l.period===period)
                  const fixedHere = fixedSlots.find(fs => fs.day===day && fs.period===period)
                  const canLock = selSubj && !teacherBusyHere && !roomBusyHere && !lockHere && !fixedHere

                  if (fixedHere) {
                    return (
                      <td key={period} style={{ padding:2, border:'1px solid #ddd' }}>
                        <div style={{ minHeight:44, borderRadius:6, background:'#f1f8e9', border:'1px solid #a5d6a7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'#388e3c', fontWeight:600 }}>
                          🏕️ {fixedHere.subjectName}
                        </div>
                      </td>
                    )
                  }

                  if (lockHere) {
                    const c = allColors[lockHere.subjectCode]
                    return (
                      <td key={period} style={{ padding:2, border:'1px solid #ddd', cursor:'pointer' }}
                        onClick={() => toggleLock(day, period)} title="คลิกเพื่อยกเลิกล็อค">
                        <div style={{
                          minHeight:44, borderRadius:6, padding:'3px 5px',
                          background: c?.bg || '#e3f2fd',
                          border: `2px solid ${c?.border || '#1976D2'}`,
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          transition:'filter 0.15s',
                        }}
                          onMouseEnter={e=>e.currentTarget.style.filter='brightness(0.88)'}
                          onMouseLeave={e=>e.currentTarget.style.filter=''}>
                          <div style={{ fontSize:'0.65rem', fontWeight:700, color: c?.text||'#1565C0' }}>🔒 {lockHere.subjectName}</div>
                          <div style={{ fontSize:'0.58rem', color:'#888', marginTop:1 }}>× คลิกยกเลิก</div>
                        </div>
                      </td>
                    )
                  }

                  if (teacherBusyHere || roomBusyHere) {
                    return (
                      <td key={period} style={{ padding:2, border:'1px solid #ddd' }}>
                        <div style={{ minHeight:44, borderRadius:6, background:'#f5f5f5', border:'1px solid #e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.63rem', color:'#bbb' }}>
                          {teacherBusyHere ? '👤 ครูติด' : '🚪 ห้องติด'}
                        </div>
                      </td>
                    )
                  }

                  return (
                    <td key={period} style={{ padding:2, border:'1px solid #ddd', cursor: canLock ? 'pointer' : 'default' }}
                      onClick={() => canLock && toggleLock(day, period)}>
                      <div style={{
                        minHeight:44, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                        border: canLock ? '2px dashed #66BB6A' : '1px dashed #e0e0e0',
                        background: canLock ? '#f1f8e9' : 'transparent',
                        color: canLock ? '#388e3c' : '#ddd',
                        fontSize:'0.65rem', fontWeight: canLock ? 600 : 400,
                        transition:'all 0.1s',
                      }}
                        onMouseEnter={e=>{ if(canLock) e.currentTarget.style.background='#c8e6c9' }}
                        onMouseLeave={e=>{ if(canLock) e.currentTarget.style.background='#f1f8e9' }}>
                        {canLock ? '+ ล็อคที่นี่' : ''}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* คาบที่ล็อคแล้วในห้องนี้ */}
      {locks.filter(l=>l.teacherId===selTId && l.roomId===selRoom).length > 0 && (
        <div className="mt-3">
          <div style={{ fontSize:'0.78rem', fontWeight:600, color:'#555', marginBottom:6 }}>
            คาบที่ล็อคไว้แล้วในห้อง {selRoom} ({locks.filter(l=>l.teacherId===selTId&&l.roomId===selRoom).length} คาบ)
          </div>
          <div className="d-flex flex-wrap gap-1 mb-2">
            {locks.filter(l=>l.teacherId===selTId && l.roomId===selRoom).map((l,i) => {
              const c = allColors[l.subjectCode]
              return (
                <span key={i} style={{
                  padding:'2px 8px', borderRadius:20, fontSize:'0.72rem', fontWeight:600,
                  background: c?.bg||'#e3f2fd', border:`1px solid ${c?.border||'#1976D2'}`, color:c?.text||'#1565C0',
                }}>
                  🔒 {l.subjectName} · {l.day} คาบ{l.period}
                </span>
              )
            })}
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={clearRoomLocks}>
            <i className="bi bi-unlock me-1"/>ล้างล็อคของห้อง {selRoom}
          </button>
        </div>
      )}
      {totalLocks > 0 && (
        <div className="mt-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={clearAllLocks}>
            <i className="bi bi-trash me-1"/>ล้างการล็อคทั้งหมด ({totalLocks} คาบ)
          </button>
        </div>
      )}
    </div>
  )
}

// ══ Tab: คาบเรียนต่อห้อง ════════════════════════════════════════
// roomPeriods: { roomId: { day: periodsCount } }
function RoomPeriodsTab({ gradeCode, roomCount, roomPeriods, maxPeriod, onUpdate }) {
  const rooms = Array.from({ length: roomCount }, (_, i) => `${gradeCode}/${i+1}`)
  const MAX = maxPeriod || 5

  // local state: { roomId: { day: count } }
  const initState = () => {
    const s = {}
    rooms.forEach(rid => {
      s[rid] = {}
      DAYS.forEach(day => { s[rid][day] = Math.min(roomPeriods?.[rid]?.[day] ?? 5, MAX) })
    })
    return s
  }
  const [perms, setPerms] = useState(initState)
  const [saved, setSaved] = useState(false)

  // sync เมื่อ roomPeriods หรือ maxPeriod เปลี่ยน
  useEffect(() => { setPerms(initState()) }, [roomPeriods, roomCount, maxPeriod])

  // default สำหรับทั้งชั้น (กำหนดพร้อมกัน)
  const [defaultVals, setDefaultVals] = useState(() => {
    const d = {}
    DAYS.forEach(day => { d[day] = 5 })
    return d
  })

  function setCell(roomId, day, val) {
    const n = Math.max(0, Math.min(MAX, parseInt(val) || 0))
    setPerms(prev => ({ ...prev, [roomId]: { ...prev[roomId], [day]: n } }))
  }

  function applyDefault() {
    const next = {}
    rooms.forEach(rid => {
      next[rid] = {}
      DAYS.forEach(day => { next[rid][day] = Math.min(defaultVals[day], MAX) })
    })
    setPerms(next)
  }

  function applyColumnDefault(day, val) {
    const n = Math.max(0, Math.min(MAX, parseInt(val) || 0))
    setDefaultVals(prev => ({ ...prev, [day]: n }))
    setPerms(prev => {
      const next = { ...prev }
      rooms.forEach(rid => { next[rid] = { ...next[rid], [day]: n } })
      return next
    })
  }

  function save() {
    onUpdate({ type: 'roomPeriods', roomPeriods: perms })
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  // สรุป
  const totals = rooms.map(rid => ({
    rid,
    total: DAYS.reduce((s, day) => s + (perms[rid]?.[day] ?? 5), 0),
  }))
  const maxTotal = Math.max(...totals.map(t => t.total))
  const minTotal = Math.min(...totals.map(t => t.total))

  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-clock me-2"/>กำหนดจำนวนคาบเรียนต่อวันต่อห้อง</p>
      <SummaryBox rows={[
        ['วิธีใช้', `ใส่จำนวนคาบในแต่ละช่อง สูงสุดไม่เกิน ${MAX} คาบ/วัน (ตามที่กำหนดใน Tab เวลาคาบ)`],
        ['คาบรวม/สัปดาห์', `${minTotal === maxTotal ? minTotal : `${minTotal}–${maxTotal}`} คาบ/ห้อง`],
        ['แถว "ทั้งชั้น"', 'ตั้งค่าพร้อมกันทุกห้องในคอลัมน์นั้น'],
      ]}/>

      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', fontSize:'0.8rem', width:'100%' }}>
          <thead>
            <tr style={{ background:'#f0f4f8' }}>
              <th style={{ padding:'6px 10px', border:'1px solid #ddd', minWidth:68, textAlign:'left' }}>ห้อง</th>
              {DAYS.map(day => (
                <th key={day} style={{ padding:'6px 8px', border:'1px solid #ddd', textAlign:'center', minWidth:88 }}>
                  {day}
                  {day === 'พุธ' && <div style={{ fontSize:'0.6rem', color:'#388E3C' }}>🏕️ Fix</div>}
                </th>
              ))}
              <th style={{ padding:'6px 8px', border:'1px solid #ddd', textAlign:'center', minWidth:68, background:'#E8EAF6', color:'#3949AB' }}>
                รวม/สัปดาห์
              </th>
            </tr>
            {/* แถว default ทั้งชั้น */}
            <tr style={{ background:'#E3F2FD' }}>
              <td style={{ padding:'4px 10px', border:'1px solid #ddd', fontWeight:700, fontSize:'0.75rem', color:'#1565C0' }}>
                ✏️ ทั้งชั้น
              </td>
              {DAYS.map(day => (
                <td key={day} style={{ padding:3, border:'1px solid #ddd' }}>
                  <input type="number" min={0} max={MAX}
                    value={defaultVals[day]}
                    onChange={e => applyColumnDefault(day, e.target.value)}
                    style={{
                      width:'100%', textAlign:'center', border:'1px solid #90CAF9',
                      borderRadius:4, padding:'3px 0', fontSize:'0.82rem',
                      fontWeight:700, color:'#1565C0', background:'#F3F8FF',
                    }}/>
                </td>
              ))}
              <td style={{ padding:'4px 8px', border:'1px solid #ddd', textAlign:'center' }}>
                <button className="btn btn-xs btn-outline-primary" style={{ fontSize:'0.68rem', padding:'2px 8px' }}
                  onClick={applyDefault}>ใช้ทุกห้อง</button>
              </td>
            </tr>
          </thead>
          <tbody>
            {rooms.map((rid, ri) => {
              const total = totals.find(t => t.rid === rid)?.total ?? 0
              const isHigh = total > 25
              return (
                <tr key={rid}>
                  <td style={{ padding:'4px 10px', border:'1px solid #ddd', fontWeight:700, fontSize:'0.78rem', color:'#1565C0', background: ri%2===0?'#F3F8FF':'#fff' }}>
                    {rid}
                  </td>
                  {DAYS.map(day => {
                    const val = perms[rid]?.[day] ?? 5
                    return (
                      <td key={day} style={{ padding:3, border:'1px solid #ddd', background: ri%2===0?'#FAFCFF':'#fff' }}>
                        <input type="number" min={0} max={MAX}
                          value={val}
                          onChange={e => setCell(rid, day, e.target.value)}
                          style={{
                            width:'100%', textAlign:'center',
                            border: val !== 5 ? '2px solid #1976D2' : '1px solid #E0E0E0',
                            borderRadius:4, padding:'4px 0', fontSize:'0.88rem',
                            fontWeight: val !== 5 ? 700 : 400,
                            color: val === 0 ? '#BDBDBD' : val > 5 ? '#C62828' : '#333',
                            background: val === 0 ? '#FAFAFA' : val > 5 ? '#FFF3E0' : '#FFFFFF',
                          }}/>
                      </td>
                    )
                  })}
                  <td style={{
                    padding:'4px 8px', border:'1px solid #ddd', textAlign:'center', fontWeight:700,
                    color: isHigh ? '#C62828' : total < 25 ? '#1565C0' : '#2E7D32',
                    background: ri%2===0?'#F3F8FF':'#fff',
                    fontSize:'0.85rem',
                  }}>
                    {total}
                    {isHigh && <span style={{ fontSize:'0.6rem', display:'block', color:'#E65100' }}>+{total-25}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 d-flex align-items-center gap-2 flex-wrap">
        <button className="btn btn-primary btn-sm" onClick={save}>
          <i className="bi bi-floppy me-1"/>บันทึก
        </button>
        {saved && <Saved/>}
        <span style={{ fontSize:'0.75rem', color:'#888' }}>
          💡 ตัวเลขสีน้ำเงิน = แตกต่างจาก 5 คาบ | สีแดง = มากกว่า 5 คาบ | มีผลเมื่อกด Random
        </span>
      </div>
    </div>
  )
}

// ══ Tab: เวลาคาบเรียน ════════════════════════════════════════════
function PeriodSlotsTab({ periodSlots, onUpdate }) {
  const [slots, setSlots] = useState(periodSlots || [])
  const [saved, setSaved] = useState(false)

  useEffect(() => { setSlots(periodSlots || []) }, [periodSlots])

  function commit(next) {
    setSlots(next)
    onUpdate({ type: 'periodSlots', periodSlots: next })
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  function setField(i, field, val) {
    const next = slots.map((s, si) => si === i ? { ...s, [field]: val } : s)
    commit(next)
  }

  function addSlot() {
    // ต่อเวลาจากคาบสุดท้าย
    const last = slots[slots.length - 1]
    const newStart = last?.end || '08:30'
    // คำนวณ end = start + 60 นาที
    const [h, m] = newStart.split(':').map(Number)
    const endMin = h * 60 + m + 60
    const newEnd = `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`
    commit([...slots, { start: newStart, end: newEnd }])
  }

  function removeSlot(i) {
    if (slots.length <= 1) return
    commit(slots.filter((_, si) => si !== i))
  }

  return (
    <div>
      <p className="dm-section-title"><i className="bi bi-clock-history me-2"/>กำหนดเวลาคาบเรียน</p>
      <SummaryBox rows={[
        ['วิธีใช้', 'กำหนดเวลาเริ่ม-สิ้นสุดของแต่ละคาบ จำนวนคาบ = สูงสุดที่ตั้งค่าคาบเรียนให้ห้องได้'],
        ['จำนวนคาบปัจจุบัน', `${slots.length} คาบ`],
        ['ผล', 'ตารางเรียน/สอนจะแสดงเวลาบน header คาบ'],
      ]}/>

      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: '#f0f4f8' }}>
              <th style={{ padding: '6px 12px', border: '1px solid #ddd', minWidth: 60, textAlign: 'center' }}>คาบที่</th>
              <th style={{ padding: '6px 12px', border: '1px solid #ddd', minWidth: 130, textAlign: 'center' }}>เวลาเริ่ม</th>
              <th style={{ padding: '6px 12px', border: '1px solid #ddd', minWidth: 130, textAlign: 'center' }}>เวลาสิ้นสุด</th>
              <th style={{ padding: '6px 12px', border: '1px solid #ddd', minWidth: 130, textAlign: 'center' }}>รวม</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd', minWidth: 50, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => {
              const bg = i % 2 === 0 ? '#f8fafc' : '#fff'
              const [sh, sm] = (slot.start||'').split(':').map(Number)
              const [eh, em] = (slot.end||'').split(':').map(Number)
              const durMin = (!isNaN(sh)&&!isNaN(eh)) ? (eh*60+em) - (sh*60+sm) : 0
              const durStr = durMin > 0 ? `${durMin} นาที` : '—'
              return (
                <tr key={i} style={{ background: bg }}>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, color: '#1565C0', fontSize: '1rem' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <input type="time" value={slot.start || ''} onChange={e => setField(i, 'start', e.target.value)}
                      style={{ border: '1px solid #ddd', borderRadius: 6, padding: '3px 8px', fontSize: '0.9rem', width: '110px', textAlign: 'center' }}/>
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <input type="time" value={slot.end || ''} onChange={e => setField(i, 'end', e.target.value)}
                      style={{ border: '1px solid #ddd', borderRadius: 6, padding: '3px 8px', fontSize: '0.9rem', width: '110px', textAlign: 'center' }}/>
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>
                    {slot.start && slot.end ? `${slot.start}–${slot.end}` : '—'}
                    <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{durStr}</div>
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <button className="btn btn-sm btn-outline-danger py-0 px-2"
                      onClick={() => removeSlot(i)} disabled={slots.length <= 1} title="ลบคาบนี้">
                      <i className="bi bi-trash"/>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 d-flex align-items-center gap-2 flex-wrap">
        <button className="btn btn-sm btn-success" onClick={addSlot}>
          <i className="bi bi-plus-circle me-1"/>เพิ่มคาบ
        </button>
        <span style={{ fontSize: '0.78rem', color: '#888' }}>
          สูงสุด {slots.length} คาบ → Tab คาบเรียนจะกำหนดได้สูงสุด {slots.length} คาบ/วัน
        </span>
        {saved && <Saved/>}
      </div>
    </div>
  )
}

// ══ TABS ═════════════════════════════════════════════════════════
const TABS = [
  {id:'rooms',       label:'ห้องเรียน',        icon:'bi-door-open'},
  {id:'timeslots',   label:'เวลาคาบ',           icon:'bi-clock-history'},
  {id:'periods',     label:'คาบเรียน',          icon:'bi-clock'},
  {id:'teachers',    label:'ครูผู้สอน',         icon:'bi-people'},
  {id:'assign',      label:'มอบหมายสอน',       icon:'bi-journal-text'},
  {id:'prelock',     label:'ล็อคคาบล่วงหน้า',  icon:'bi-lock-fill'},
  {id:'unavailable', label:'ไม่ว่าง',           icon:'bi-calendar-x'},
  {id:'subjects',    label:'วิชา & สี',         icon:'bi-palette'},
  {id:'fixed',       label:'วิชา Fix',          icon:'bi-pin-angle-fill'},
]

export default function DataManager({ show, onClose, gradeCode, roomCount, teachers, fixedSlots, customColors, preLocks, teacherUnavailable, customSubjects, roomPeriods, periodSlots, onUpdate }) {
  const [tab, setTab] = useState('rooms')
  if (!show) return null
  const maxPeriod = periodSlots?.length || 5
  return (
    <div className="dm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="dm-modal" style={{maxWidth:960}}>
        <div className="dm-header">
          <div>
            <div style={{fontFamily:'Kanit,sans-serif',fontWeight:700,fontSize:'1.05rem'}}><i className="bi bi-gear-fill me-2"/>จัดการข้อมูลระบบ</div>
            <div style={{fontSize:'0.76rem',opacity:0.7,marginTop:2}}>การแก้ไขมีผลทันทีเมื่อกด Random ครั้งถัดไป</div>
          </div>
          <button className="btn-close btn-close-white" onClick={onClose}/>
        </div>
        <div className="dm-tabs">
          {TABS.map(t=>(
            <button key={t.id} className={`dm-tab-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
              <i className={`bi ${t.icon} me-1`}/>{t.label}
              {t.id==='prelock' && preLocks?.length>0 && (
                <span className="badge rounded-pill ms-1" style={{background:'#1976D2',fontSize:'0.63rem'}}>{preLocks.length}</span>
              )}
              {t.id==='unavailable' && teacherUnavailable?.length>0 && (
                <span className="badge rounded-pill ms-1" style={{background:'#E65100',fontSize:'0.63rem'}}>{teacherUnavailable.length}</span>
              )}
              {t.id==='timeslots' && (
                <span className="badge rounded-pill ms-1" style={{background:'#0277BD',fontSize:'0.63rem'}}>{maxPeriod} คาบ</span>
              )}
            </button>
          ))}
        </div>
        <div className="dm-body">
          {tab==='rooms'       && <RoomsTab gradeCode={gradeCode} roomCount={roomCount} onUpdate={onUpdate}/>}
          {tab==='timeslots'   && <PeriodSlotsTab periodSlots={periodSlots||[]} onUpdate={onUpdate}/>}
          {tab==='periods'     && <RoomPeriodsTab gradeCode={gradeCode} roomCount={roomCount} roomPeriods={roomPeriods||{}} fixedSlots={fixedSlots||[]} maxPeriod={maxPeriod} onUpdate={onUpdate}/>}
          {tab==='teachers'    && <TeachersTab teachers={teachers} onUpdate={onUpdate}/>}
          {tab==='assign'      && <AssignTab teachers={teachers} gradeCode={gradeCode} roomCount={roomCount} customSubjects={customSubjects||[]} onUpdate={onUpdate}/>}
          {tab==='prelock'     && <PreLockTab teachers={teachers} gradeCode={gradeCode} roomCount={roomCount} preLocks={preLocks||[]} fixedSlots={fixedSlots} customColors={customColors} roomPeriods={roomPeriods||{}} onUpdate={onUpdate}/>}
          {tab==='unavailable' && <UnavailableTab teachers={teachers} fixedSlots={fixedSlots} teacherUnavailable={teacherUnavailable||[]} roomPeriods={roomPeriods||{}} onUpdate={onUpdate}/>}
          {tab==='subjects'    && <SubjectsColorTab teachers={teachers} gradeCode={gradeCode} roomCount={roomCount} customColors={customColors} onUpdate={onUpdate}/>}
          {tab==='fixed'       && <FixedTab fixedSlots={fixedSlots} onUpdate={onUpdate}/>}
        </div>
      </div>
    </div>
  )
}
