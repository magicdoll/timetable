import { useState, useCallback, useMemo, useRef } from 'react'
import TimetableGrid from './components/TimetableGrid.jsx'
import DataManager from './components/DataManager.jsx'
import ManualEditor from './components/ManualEditor.jsx'
import { generateTimetable } from './utils/timetableGenerator.js'
import { DEFAULT_SUBJECT_COLORS } from './utils/subjectColors.js'
import { GRADE_LEVEL_GROUPS, GRADE_CODE, ROOMS_PER_GRADE, MOCK_TEACHERS_BY_GRADE, DAYS, PERIODS, DEFAULT_PERIOD_SLOTS } from './utils/mockData.js'
import { exportToExcel } from './utils/excelExport.js'
import { importFromExcel } from './utils/importExcel.js'
import { downloadTemplate } from './utils/templateExcel.js'

const DEFAULT_FIXED = [{ subjectName:'ลูกเสือ', subjectCode:'SCOUT', day:'พุธ', period:5 }]

export default function App() {
  const [grade,    setGrade]    = useState(null)

  // ── per-grade data store: เก็บข้อมูลแยกต่อ grade ──────────────
  // { [gradeName]: { teachers, roomCount, fixed, colors, preLocks, teacherUnavailable, customSubjects, roomPeriods } }
  const [gradeStore, setGradeStore] = useState({})

  // ── derived: ดึงข้อมูล grade ปัจจุบันออกมา ──────────────────
  const gradeData = grade ? (gradeStore[grade] || {}) : {}
  const teachers           = gradeData.teachers           ?? []
  const roomCount          = gradeData.roomCount          ?? 5
  const fixed              = gradeData.fixed              ?? DEFAULT_FIXED
  const colors             = gradeData.colors             ?? {}
  const preLocks           = gradeData.preLocks           ?? []
  const teacherUnavailable = gradeData.teacherUnavailable ?? []
  const customSubjects     = gradeData.customSubjects     ?? []
  const roomPeriods        = gradeData.roomPeriods        ?? {}
  const periodSlots        = gradeData.periodSlots        ?? DEFAULT_PERIOD_SLOTS

  // ── helper: อัปเดตข้อมูลของ grade ปัจจุบัน ─────────────────
  const setGradeField = useCallback((fields) => {
    if (!grade) return
    setGradeStore(prev => ({
      ...prev,
      [grade]: { ...(prev[grade]||{}), ...fields }
    }))
  }, [grade])

  const [tSched,   setTSched]   = useState(null)
  const [cSched,   setCSched]   = useState(null)
  const [load,     setLoad]     = useState(null)
  const [rooms,    setRooms]    = useState([])
  const [warns,    setWarns]    = useState([])
  const [generating,setGen]     = useState(false)
  const [done,     setDone]     = useState(false)
  const [exporting, setExporting]   = useState(false)
  const [importing, setImporting]   = useState(false)
  const [importMsg, setImportMsg]   = useState(null)  // {type:'success'|'error', text}
  const [dlTemplate, setDlTemplate] = useState(false)

  const [showMgr,  setShowMgr]  = useState(false)
  const [manualW,  setManualW]  = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const importRef = useRef()

  const allColors = useMemo(()=>({...DEFAULT_SUBJECT_COLORS,...colors}),[colors])

  // ── เลือกชั้น — ไม่ reset ข้อมูล เพียงแค่สลับ grade ──────────
  function selectGrade(g) {
    setGrade(g)
    setTSched(null); setCSched(null); setLoad(null)
    setDone(false); setWarns([]); setManualW(null)
    setImportMsg(null)
    // ถ้า grade นี้ยังไม่มีข้อมูลเลย → ตั้งค่า default
    setGradeStore(prev => {
      if (prev[g]) return prev  // มีข้อมูลแล้ว ไม่ต้อง reset
      return {
        ...prev,
        [g]: {
          teachers:           MOCK_TEACHERS_BY_GRADE[g] || [],
          roomCount:          ROOMS_PER_GRADE[g] || 5,
          fixed:              DEFAULT_FIXED,
          colors:             {},
          preLocks:           [],
          teacherUnavailable: [],
          customSubjects:     [],
          roomPeriods:        {},
          periodSlots:        [...DEFAULT_PERIOD_SLOTS],
        }
      }
    })
  }

  // ── DataManager update ───────────────────────────────────────
  function onUpdate(action) {
    if (action.type==='rooms')       { setGradeField({ roomCount: action.roomCount }); setDone(false) }
    if (action.type==='teachers')    { setGradeField({ teachers: action.teachers });   setDone(false) }
    if (action.type==='fixed')       { setGradeField({ fixed: action.fixedSlots });    setDone(false) }
    if (action.type==='colors')      { setGradeField({ colors: action.colors }) }
    if (action.type==='prelocks')    { setGradeField({ preLocks: action.preLocks }) }
    if (action.type==='unavailable') { setGradeField({ teacherUnavailable: action.teacherUnavailable }) }
    if (action.type==='roomPeriods') { setGradeField({ roomPeriods: action.roomPeriods }); setDone(false) }
    if (action.type==='periodSlots') { setGradeField({ periodSlots: action.periodSlots }); setDone(false) }
    if (action.type==='addSubject')  {
      setGradeStore(prev => {
        const cur = prev[grade] || {}
        const prevSubj = cur.customSubjects || []
        return { ...prev, [grade]: { ...cur, customSubjects: [...prevSubj.filter(s=>s.code!==action.subjectCode), {code:action.subjectCode,name:action.subjectName}] } }
      })
    }
    if (action.type==='removeSubject') {
      setGradeStore(prev => {
        const cur = prev[grade] || {}
        const prevSubj = cur.customSubjects || []
        return { ...prev, [grade]: { ...cur, customSubjects: prevSubj.filter(s=>s.code!==action.subjectCode) } }
      })
    }
  }

  // ── Random (กด confirm แล้วค่อย generate) ───────────────────
  function handleRandomClick() {
    if (done) {
      setShowConfirm(true)
    } else {
      generate()
    }
  }

  async function generate() {
    setShowConfirm(false)
    if (!grade||!teachers.length) return
    setGen(true)
    await new Promise(r=>setTimeout(r,400))
    const gc = GRADE_CODE[grade]
    const customRooms = Array.from({length:roomCount},(_,i)=>`${gc}/${i+1}`)
    // roomPeriods คือ { roomId: { day: periodsCount } } — ส่งตรงไปยัง generator
    const result = generateTimetable(grade, teachers, { customRooms, fixedSlots:fixed, preLocks, teacherUnavailable, roomPeriods })
    setTSched(result.teacherSchedules)
    setCSched(result.classSchedules)
    setLoad(result.teacherLoad)
    setRooms(result.rooms)
    setWarns(result.warnings||[])
    setDone(true); setGen(false); setManualW(null)
  }

  // ── Export ตารางเรียน Excel ──────────────────────────────────
  async function handleExport() {
    setExporting(true)
    await new Promise(r => setTimeout(r, 100))
    try {
      await exportToExcel({ grade, teachers, rooms, classSchedules: cSched, teacherSchedules: tSched, customColors: colors })
    } catch(e) { console.error(e); alert('เกิดข้อผิดพลาด: ' + e.message) }
    setExporting(false)
  }

  // ── Download Template ─────────────────────────────────────────
  async function handleDownloadTemplate() {
    setDlTemplate(true)
    await new Promise(r => setTimeout(r, 100))
    try {
      const gc = grade ? GRADE_CODE[grade] : ''
      const currentRooms = gc ? Array.from({length:roomCount},(_,i)=>`${gc}/${i+1}`) : []
      await downloadTemplate({
        roomCounts:  { [grade||'ประถม 5']: roomCount },
        teachers,
        colors,
        fixedSlots:  fixed,
        roomPeriods,
        rooms: currentRooms,
      })
    } catch(e) { console.error(e); alert('เกิดข้อผิดพลาด: ' + e.message) }
    setDlTemplate(false)
  }

  // ── Import Excel ─────────────────────────────────────────────
  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true); setImportMsg(null)
    try {
      const data = await importFromExcel(file)
      let applied = []

      // ใส่ข้อมูลเข้า state
      const fields = {}
      if (data.teachers?.length > 0) {
        fields.teachers = data.teachers; applied.push(`ครู ${data.teachers.length} คน`)
      }
      if (Object.keys(data.colors||{}).length > 0) {
        fields.colors = { ...colors, ...data.colors }; applied.push(`วิชา&สี ${Object.keys(data.colors).length} วิชา`)
      }
      if (data.fixedSlots?.length > 0) {
        fields.fixed = data.fixedSlots; applied.push(`Fix slots ${data.fixedSlots.length} รายการ`)
      }
      if (Object.keys(data.roomPeriods||{}).length > 0) {
        fields.roomPeriods = data.roomPeriods; applied.push(`คาบเรียน ${Object.keys(data.roomPeriods).length} ห้อง`)
      }
      if (grade && data.roomCounts?.[grade]) {
        fields.roomCount = data.roomCounts[grade]; applied.push(`ห้อง ${data.roomCounts[grade]} ห้อง`)
      }
      if (Object.keys(fields).length > 0) setGradeField(fields)
      setDone(false)
      setImportMsg({ type:'success', text:`✅ Import สำเร็จ: ${applied.join(' | ')} (Sheet ที่พบ: ${data.sheetsFound?.join(', ')})` })
    } catch(e) {
      console.error(e)
      setImportMsg({ type:'error', text:`❌ Import ล้มเหลว: ${e.message}` })
    }
    setImporting(false)
  }

  // ── Manual apply ─────────────────────────────────────────────
  function onManualApply(roomId, newRS, newTS, resolvedWarning) {
    setCSched(p=>({...p,[roomId]:newRS}))
    setTSched(newTS)
    setWarns(p=>p.filter(w=>{
      // ลบ empty slots ที่แก้แล้ว
      if (w.type==='empty'&&w.roomId===roomId) return !newRS[w.day]?.[w.period]
      // ลบ unplaced warning ที่ resolve แล้ว
      if (resolvedWarning && w.type==='unplaced' && w.teacherId===resolvedWarning.teacherId && w.roomId===resolvedWarning.roomId && w.subjectCode===resolvedWarning.subjectCode) return false
      return true
    }))
    setManualW(null)  // ปิด modal อัตโนมัติ
  }

  const gradeCode = grade ? GRADE_CODE[grade] : ''
  const errWarn   = warns.filter(w=>w.type==='unplaced')
  const emptyWarn = warns.filter(w=>w.type==='empty')

  // subjects unique
  const subjects = useMemo(()=>[...new Set(teachers.flatMap(t=>t.assignments.map(a=>a.subjectCode)))]
    .map(code=>{ const a=teachers.flatMap(t=>t.assignments).find(x=>x.subjectCode===code); return {code,name:a?.subjectName||code} })
  ,[teachers])

  // teacher summary with per-room per-subject periods
  const teacherSum = useMemo(()=>teachers.map(t=>({
    ...t,
    totalP: t.assignments.reduce((s,a)=>s+a.periodsPerWeek,0),
    subjDet: t.assignments.reduce((acc,a)=>{
      if (!acc[a.subjectCode]) acc[a.subjectCode]={name:a.subjectName,code:a.subjectCode,rooms:[]}
      acc[a.subjectCode].rooms.push({id:a.roomId.split('/')[1],p:a.periodsPerWeek})
      return acc
    },{}),
  })),[teachers])

  // room summary — depend on gradeStore เพื่อให้ re-compute ทุกครั้งที่ข้อมูลเปลี่ยน
  const roomSum = useMemo(()=>{
    if (!grade) return []
    const gc = GRADE_CODE[grade]
    const _teachers    = gradeStore[grade]?.teachers    ?? []
    const _fixed       = gradeStore[grade]?.fixed       ?? DEFAULT_FIXED
    const _roomPeriods = gradeStore[grade]?.roomPeriods ?? {}
    const _roomCount   = gradeStore[grade]?.roomCount   ?? 5
    return Array.from({length:_roomCount},(_,i)=>`${gc}/${i+1}`).map(rid=>{
      const subjMap={}
      _teachers.forEach(t=>t.assignments.filter(a=>a.roomId===rid).forEach(a=>{
        if (subjMap[a.subjectCode]) {
          // ครูหลายคนสอนวิชาเดียวกันในห้องเดียวกัน → บวกคาบรวมกัน
          subjMap[a.subjectCode].periods += a.periodsPerWeek
        } else {
          subjMap[a.subjectCode]={name:a.subjectName,code:a.subjectCode,periods:a.periodsPerWeek}
        }
      }))
      _fixed.forEach(fs=>{ subjMap[fs.subjectCode]={name:fs.subjectName,code:fs.subjectCode,periods:1} })
      const total=Object.values(subjMap).reduce((s,v)=>s+v.periods,0)
      const dayMap = _roomPeriods[rid] || {}
      const maxP = DAYS.reduce((s,d) => s + (dayMap[d] ?? 5), 0)
      return {rid, subjects:Object.values(subjMap), total, maxP}
    })
  },[grade, gradeStore])

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* NAVBAR */}
      <nav className="app-navbar d-flex align-items-center gap-3">
        <i className="bi bi-calendar3" style={{fontSize:'1.3rem',color:'rgba(255,255,255,0.8)'}}/>
        <div>
          <div className="brand-title">ระบบจัดตารางเรียนตารางสอน</div>
          <div className="brand-sub">School Timetable Management System</div>
        </div>
        <div className="d-flex gap-2 ms-auto align-items-center flex-wrap">
          {/* ปุ่ม Download Template */}
          <button className="btn btn-sm" style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.35)', fontSize:'0.78rem', borderRadius:18, padding:'4px 12px', display:'flex', alignItems:'center', gap:5 }}
            onClick={handleDownloadTemplate} disabled={dlTemplate} title="โหลด Excel Template (พร้อมข้อมูลปัจจุบัน)">
            {dlTemplate ? <span className="spinner-border spinner-border-sm"/> : <i className="bi bi-download"/>}
            Template
          </button>
          {/* ปุ่ม Import Excel */}
          <button className="btn btn-sm" style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.35)', fontSize:'0.78rem', borderRadius:18, padding:'4px 12px', display:'flex', alignItems:'center', gap:5 }}
            onClick={()=>importRef.current?.click()} disabled={importing} title="Import ข้อมูลจาก Excel Template">
            {importing ? <span className="spinner-border spinner-border-sm"/> : <i className="bi bi-upload"/>}
            Import
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleImportFile}/>
          {grade&&<button className="btn-manage btn" onClick={()=>setShowMgr(true)}>
            <i className="bi bi-gear-fill me-1"/>จัดการข้อมูล
          </button>}
        </div>
      </nav>

      <main className="flex-grow-1 py-3 px-2 px-md-4" style={{maxWidth:1440,margin:'0 auto',width:'100%'}}>

        {/* GRADE SELECTOR */}
        <div className="grade-selector-card p-3 mb-3">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-mortarboard-fill" style={{color:'var(--primary-light)',fontSize:'1.1rem'}}/>
            <span style={{fontFamily:'Kanit,sans-serif',fontWeight:600,color:'var(--primary)'}}>เลือกระดับชั้นที่ต้องการจัดตาราง</span>
          </div>
          {Object.entries(GRADE_LEVEL_GROUPS).map(([lvl,gl])=>(
            <div key={lvl}>
              <div className="level-group-label">{lvl}</div>
              <div className="d-flex flex-wrap gap-2">
                {gl.map(g=>(
                  <button key={g} className={`grade-btn btn btn-sm ${grade===g?'active':''}`} onClick={()=>selectGrade(g)}>{g}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* IMPORT MESSAGE */}
        {importMsg && (
          <div className={`alert ${importMsg.type==='success'?'alert-success':'alert-danger'} mb-3 py-2 d-flex align-items-start gap-2`} style={{fontSize:'0.82rem'}}>
            <span className="flex-grow-1">{importMsg.text}</span>
            <button className="btn-close" style={{fontSize:'0.7rem'}} onClick={()=>setImportMsg(null)}/>
          </div>
        )}

        {grade&&<>
          {/* INFO CARDS */}
          <div className="row g-3 mb-3">
            {/* วิชา */}
            <div className="col-12 col-md-3">
              <div className="info-card p-3 h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-book-fill" style={{color:'var(--accent)'}}/>
                  <span style={{fontFamily:'Kanit,sans-serif',fontWeight:600,color:'var(--primary)',fontSize:'0.9rem'}}>วิชา ({subjects.length})</span>
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {subjects.map(s=>{
                    const c=allColors[s.code]
                    return (
                      <span key={s.code} style={{
                        display:'flex',alignItems:'center',gap:4,fontSize:'0.75rem',
                        background:c?.bg||'#f5f5f5',borderLeft:`3px solid ${c?.border||'#bbb'}`,
                        color:c?.text||'#333',borderRadius:4,padding:'2px 7px',
                      }}>
                        {s.name}
                      </span>
                    )
                  })}
                  {fixed.map((fs,i)=>(
                    <span key={i} style={{fontSize:'0.75rem',background:'#e8f5e9',borderLeft:'3px solid #66bb6a',color:'#2e7d32',borderRadius:4,padding:'2px 7px'}}>
                      🏕️ {fs.subjectName}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ครู */}
            <div className="col-12 col-md-5">
              <div className="info-card p-3 h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-people-fill" style={{color:'var(--primary-light)'}}/>
                  <span style={{fontFamily:'Kanit,sans-serif',fontWeight:600,color:'var(--primary)',fontSize:'0.9rem'}}>ครูผู้สอน ({teachers.length} คน)</span>

                </div>
                <div style={{maxHeight:200,overflowY:'auto'}}>
                  {teacherSum.map(t=>(
                    <div key={t.teacherId} className="teacher-item">
                      <div className="teacher-avatar" style={{fontSize:'0.7rem',flexShrink:0}}>{t.teacherName.slice(0,2)}</div>
                      <div className="flex-grow-1" style={{minWidth:0}}>
                        <div className="d-flex align-items-center flex-wrap gap-1">
                          <span style={{fontWeight:600,fontSize:'0.84rem'}}>{t.teacherName}</span>
                          <span className="badge rounded-pill" style={{
                            background:t.totalP>25?'#dc3545':t.totalP>=20?'#fd7e14':'#198754',fontSize:'0.63rem'
                          }}>{t.totalP} คาบ</span>
                        </div>
                        {/* รายวิชา + ห้อง + คาบ — แยกแต่ละวิชาเป็นบรรทัด */}
                        <div style={{fontSize:'0.7rem',color:'#888',marginTop:3,display:'flex',flexDirection:'column',gap:2}}>
                          {Object.values(t.subjDet).map(sd=>(
                            <div key={sd.code} style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
                              <span style={{width:7,height:7,borderRadius:'50%',background:allColors[sd.code]?.border||'#ccc',display:'inline-block',flexShrink:0}}/>
                              <span style={{color:allColors[sd.code]?.text||'#555',fontWeight:600,fontSize:'0.69rem'}}>{sd.name}:</span>
                              {sd.rooms.map(r=>(
                                <span key={r.id} style={{background:'#f0f4f8',borderRadius:3,padding:'0 4px',fontSize:'0.65rem',border:'1px solid #e0e0e0'}}>
                                  ห้อง{r.id} · {r.p} คาบ
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ห้องเรียน */}
            <div className="col-12 col-md-4">
              <div className="info-card p-3 h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-door-open-fill" style={{color:'var(--primary-light)'}}/>
                  <span style={{fontFamily:'Kanit,sans-serif',fontWeight:600,color:'var(--primary)',fontSize:'0.9rem'}}>ห้องเรียน ({roomCount} ห้อง)</span>
                </div>
                <div style={{maxHeight:200,overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
                  {roomSum.map(rs=>(
                    <div key={rs.rid} style={{background:'#f8fafc',borderRadius:8,padding:'5px 9px',border:'1px solid var(--border)'}}>
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span style={{fontWeight:700,fontSize:'0.8rem',color:'var(--primary)'}}>ห้อง {rs.rid}</span>
                        <span className="badge rounded-pill" style={{
                          background:rs.total>=rs.maxP?'#198754':rs.total>=(rs.maxP*0.8)?'#fd7e14':'#dc3545',fontSize:'0.62rem'
                        }}>{rs.total}/{rs.maxP} คาบ</span>
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        {rs.subjects.map(s=>{
                          const c=allColors[s.code]
                          return (
                            <span key={s.code} style={{
                              fontSize:'0.62rem',padding:'1px 5px',borderRadius:4,
                              background:c?.bg||'#f0f0f0',border:`1px solid ${c?.border||'#ccc'}`,color:c?.text||'#333'
                            }}>
                              {s.name} {s.periods}คาบ
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RANDOM BUTTON */}
          {teachers.length>0&&(
            <div className="d-flex justify-content-center mb-4">
              <button className="btn-random btn" onClick={handleRandomClick} disabled={generating}>
                {generating
                  ? <><span className="spinner-border me-2" role="status"/>กำลังจัดตาราง...</>
                  : <><i className="bi bi-shuffle me-2"/>{done?'🔄 Random ใหม่':'🎲 Random จัดตาราง'}</>}
              </button>
            </div>
          )}
        </>}

        {/* RESULT BANNERS */}
        {done&&warns.length===0&&(
          <div className="alert alert-success mb-3 rounded-3 py-2 d-flex align-items-center gap-2 flex-wrap">
            <div className="flex-grow-1">
              <i className="bi bi-check-circle-fill me-2"/><strong>จัดตารางสำเร็จ! ทุกคาบมีวิชา ✓</strong>
            </div>
            <button className="btn btn-sm" style={{ background:'#1B5E20', color:'#fff', fontFamily:'Kanit,sans-serif', fontWeight:600, fontSize:'0.82rem', padding:'5px 14px', borderRadius:20, boxShadow:'0 2px 8px rgba(27,94,32,0.3)', display:'flex', alignItems:'center', gap:6 }}
              onClick={handleExport} disabled={exporting}>
              {exporting
                ? <><span className="spinner-border spinner-border-sm"/>กำลัง Export...</>
                : <><i className="bi bi-file-earmark-excel-fill" style={{fontSize:'1rem'}}/>📊 Export Excel</>}
            </button>
          </div>
        )}
        {done&&(errWarn.length>0||emptyWarn.length>0)&&(
          <div className="alert mb-3 rounded-3" style={{background:'#fff8e1',border:'1px solid #ffe082'}}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-exclamation-triangle-fill" style={{color:'#f9a825',fontSize:'1.1rem'}}/>
              <strong style={{fontFamily:'Kanit,sans-serif'}}>พบปัญหา {errWarn.length+emptyWarn.length} รายการ</strong>
              {emptyWarn.length>0&&<span className="badge bg-danger">{emptyWarn.length} คาบว่าง</span>}
            </div>
            {errWarn.map((w,i)=>(
              <div key={i} className="d-flex align-items-start gap-2 py-1" style={{borderTop:i>0?'1px dashed #ffe082':'none',fontSize:'0.81rem',color:'#795548'}}>
                <span className="flex-grow-1">
                  {w.msg}&nbsp;<span style={{fontSize:'0.73rem',color:'#aaa'}}>{w.reason}</span>
                </span>
                <button className="btn btn-sm flex-shrink-0" style={{
                  background:'#fff3cd',border:'1px solid #ffe082',fontSize:'0.73rem',
                  padding:'2px 10px',borderRadius:20,whiteSpace:'nowrap',
                }} onClick={()=>setManualW(w)}>
                  <i className="bi bi-tools me-1"/>จัดการ
                </button>
              </div>
            ))}
            {emptyWarn.length>0&&(
              <div style={{fontSize:'0.75rem',color:'#aaa',marginTop:6,paddingTop:6,borderTop:'1px dashed #ffe082'}}>
                คาบว่าง: {emptyWarn.slice(0,8).map(w=>`${w.roomId} ${w.day}คาบ${w.period}`).join(', ')}
                {emptyWarn.length>8?` ...+${emptyWarn.length-8}`:''}
              </div>
            )}
          </div>
        )}

        {/* TEACHER LOAD */}
        {done&&load&&(
          <div className="info-card p-3 mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-bar-chart-fill" style={{color:'var(--primary-light)'}}/>
              <span style={{fontFamily:'Kanit,sans-serif',fontWeight:600,color:'var(--primary)'}}>ภาระงานครู (คาบจริง)</span>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {Object.values(load).map(tl=>(
                <div key={tl.name} className="d-flex align-items-center gap-1 px-2 py-1 rounded-3"
                  style={{background:'#f4f7fb',border:'1px solid var(--border)',fontSize:'0.79rem'}}>
                  <span style={{fontWeight:600}}>{tl.name}</span>
                  <span className="badge rounded-pill" style={{
                    background:tl.periods>25?'#dc3545':tl.periods>=20?'#fd7e14':'#198754',fontSize:'0.67rem'
                  }}>{tl.periods} คาบ</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATES */}
        {!grade&&<div className="empty-state"><i className="bi bi-calendar3"/><h5>เลือกระดับชั้นเพื่อเริ่มจัดตาราง</h5></div>}
        {grade&&!done&&!generating&&<div className="empty-state"><i className="bi bi-shuffle"/><h5>พร้อมจัดตาราง {grade}</h5><p style={{fontSize:'0.9rem'}}>กดปุ่ม Random หรือปรับข้อมูลก่อนด้วย "จัดการข้อมูล"</p></div>}
        {generating&&<div className="loading-overlay"><div className="spinner-border" style={{width:'2.5rem',height:'2.5rem'}} role="status"/><span style={{fontFamily:'Kanit,sans-serif',fontWeight:500}}>กำลัง random จัดตาราง...</span></div>}

        {/* TIMETABLES */}
        {done&&!generating&&<>
          {/* ครู — 2 col */}
          <div className="mb-4">
            <div className="timetable-section-title"><i className="bi bi-person-badge-fill"/>ตารางสอนครู — ชั้น {grade}</div>
            <div className="row g-3">
              {teacherSum.map(t=>{
                const tl=load?.[t.teacherId]
                return (
                  <div key={t.teacherId} className="col-12 col-xl-6">
                    <div className="timetable-card">
                      <div className="timetable-card-header">
                        <i className="bi bi-person-fill"/>
                        <span>{t.teacherName}</span>
                        <span style={{opacity:0.7,fontWeight:400,fontSize:'0.7rem',marginLeft:6}}>
                          {Object.values(t.subjDet).map(sd=>`${sd.name}(${sd.rooms.map(r=>`ห้อง${r.id}·${r.p}คาบ`).join(',')})`).join(' · ')}
                        </span>
                        {tl&&<span className="ms-auto badge rounded-pill flex-shrink-0" style={{
                          background:tl.periods>25?'#dc3545':tl.periods>=20?'#fd7e14':'rgba(255,255,255,0.2)',fontSize:'0.67rem'
                        }}>{tl.periods}คาบ</span>}
                      </div>
                      <TimetableGrid schedule={tSched[t.teacherId]} mode="teacher" customColors={colors} periodSlots={periodSlots}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ห้อง — 2 col */}
          <div className="mb-4">
            <div className="timetable-section-title"><i className="bi bi-door-open-fill"/>ตารางเรียนนักเรียน — ชั้น {grade}</div>
            <div className="row g-3">
              {rooms.map(rid=>{
                const re=emptyWarn.filter(w=>w.roomId===rid)
                return (
                  <div key={rid} className="col-12 col-xl-6">
                    <div className="timetable-card">
                      <div className="timetable-card-header d-flex align-items-center gap-2">
                        <i className="bi bi-grid-3x3-gap-fill"/><span>ห้อง {rid}</span>
                        {re.length>0&&<span className="badge bg-danger ms-auto" style={{fontSize:'0.66rem'}}>{re.length} คาบว่าง</span>}
                      </div>
                      <TimetableGrid schedule={cSched[rid]} mode="class" customColors={colors} periodSlots={periodSlots}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>}
      </main>

      <footer style={{background:'var(--primary)',color:'rgba(255,255,255,0.5)',textAlign:'center',padding:'0.8rem',fontSize:'0.76rem'}}>
        ระบบจัดตารางเรียนตารางสอน — School Timetable Management System
      </footer>

      {/* MODALS */}
      {grade&&<DataManager show={showMgr} onClose={()=>setShowMgr(false)}
        gradeCode={gradeCode} roomCount={roomCount} teachers={teachers}
        fixedSlots={fixed} customColors={colors} preLocks={preLocks}
        teacherUnavailable={teacherUnavailable} customSubjects={customSubjects}
        roomPeriods={roomPeriods}
        periodSlots={periodSlots}
        onUpdate={onUpdate}/>}

      {manualW&&cSched&&tSched&&<ManualEditor show={!!manualW} onClose={()=>setManualW(null)}
        warning={manualW} classSchedules={cSched} teacherSchedules={tSched}
        customColors={colors} onApply={onManualApply}/>}

      {/* CONFIRM RANDOM MODAL */}
      {showConfirm&&(
        <div className="dm-overlay" onClick={()=>setShowConfirm(false)}>
          <div style={{
            background:'#fff', borderRadius:16,
            boxShadow:'0 20px 60px rgba(0,0,0,0.25)',
            width:'100%', maxWidth:420, padding:'2rem',
            animation:'slideUp 0.2s ease',
          }} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',marginBottom:'1.25rem'}}>
              <div style={{fontSize:'2.8rem',marginBottom:'0.5rem'}}>🔄</div>
              <div style={{fontFamily:'Kanit,sans-serif',fontWeight:700,fontSize:'1.1rem',color:'var(--primary)'}}>
                Random ตารางใหม่?
              </div>
              <div style={{fontSize:'0.87rem',color:'#888',marginTop:'0.5rem',lineHeight:1.6}}>
                ตารางปัจจุบันของชั้น <strong>{grade}</strong> จะถูกล้างออกทั้งหมด<br/>
                รวมถึงการแก้ไข Manual ที่ทำไว้ด้วย
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary flex-grow-1"
                onClick={()=>setShowConfirm(false)}>
                <i className="bi bi-x-lg me-1"/>ยกเลิก
              </button>
              <button className="btn flex-grow-1" style={{
                background:'linear-gradient(135deg,var(--primary),var(--primary-light))',
                color:'#fff', fontFamily:'Kanit,sans-serif', fontWeight:600,
              }} onClick={generate}>
                <i className="bi bi-shuffle me-1"/>Random ใหม่เลย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
