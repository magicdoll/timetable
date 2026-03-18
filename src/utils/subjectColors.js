/**
 * subjectColors.js — สีประจำวิชา (ผูกกับ subjectCode ทุกที่ในระบบ)
 * แก้ไขสีได้จาก DataManager → Tab "สรุปวิชา"
 */

export const DEFAULT_SUBJECT_COLORS = {}
/*
{
  TH:    { bg: '#FFF9C4', border: '#F9A825', text: '#5D4037', label: 'ภาษาไทย' },
  MA:    { bg: '#E3F2FD', border: '#1976D2', text: '#0D47A1', label: 'คณิตศาสตร์' },
  SC:    { bg: '#E8F5E9', border: '#388E3C', text: '#1B5E20', label: 'วิทยาศาสตร์' },
  SO:    { bg: '#FFF3E0', border: '#E65100', text: '#BF360C', label: 'สังคมศึกษา' },
  EN:    { bg: '#FCE4EC', border: '#C2185B', text: '#880E4F', label: 'ภาษาอังกฤษ' },
  PE:    { bg: '#E8EAF6', border: '#3949AB', text: '#1A237E', label: 'พลศึกษา' },
  AR:    { bg: '#F3E5F5', border: '#7B1FA2', text: '#4A148C', label: 'ศิลปะ' },
  CO:    { bg: '#E0F7FA', border: '#00838F', text: '#006064', label: 'คอมพิวเตอร์' },
  HE:    { bg: '#E8F5E9', border: '#2E7D32', text: '#1B5E20', label: 'สุขศึกษา' },
  CR:    { bg: '#FBE9E7', border: '#D84315', text: '#BF360C', label: 'การงานอาชีพ' },
  SCOUT: { bg: '#F1F8E9', border: '#558B2F', text: '#33691E', label: 'ลูกเสือ' },
  FREE:  { bg: '#F5F5F5', border: '#BDBDBD', text: '#9E9E9E', label: 'ว่าง' },
  BUSY:  { bg: '#FFF3E0', border: '#E65100', text: '#BF360C', label: 'ไม่ว่าง' },
}
*/

// คืน style object สำหรับใส่ใน slot
export function getSubjectStyle(subjectCode, customColors = {}) {
  const c = customColors[subjectCode] || DEFAULT_SUBJECT_COLORS[subjectCode] || DEFAULT_SUBJECT_COLORS.FREE
  return {
    background:   c.bg,
    borderLeft:   `4px solid ${c.border}`,
    color:        c.text,
  }
}

export function getSubjectDot(subjectCode, customColors = {}) {
  const c = customColors[subjectCode] || DEFAULT_SUBJECT_COLORS[subjectCode]
  return c ? c.border : '#BDBDBD'
}
