/**
 * api/timetableService.js
 * ====================================================
 * รวม API calls ทั้งหมดสำหรับระบบตารางเรียนตารางสอน
 * ใช้ axios สำหรับการ call API ไปยัง Node.js Express backend
 *
 * Base URL: http://localhost:5000/api  (กำหนดใน .env)
 * ====================================================
 */

import axios from 'axios'

// ── สร้าง axios instance พร้อม config พื้นฐาน ──────────────────────────────
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor: แนบ token ถ้ามี ──────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // ถ้ามี auth token สามารถแนบไปได้ที่นี่
    // const token = localStorage.getItem('token')
    // if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: จัดการ error กลาง ──────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'เกิดข้อผิดพลาด'
    console.error('[API Error]', message)
    return Promise.reject(error)
  }
)

// ============================================================
//  ตัวอย่าง GET Requests
// ============================================================

/**
 * ดึงรายชื่อระดับชั้นทั้งหมดจาก Excel
 * GET /api/grades
 *
 * Response: { data: ["ประถม 1", "ประถม 2", ..., "มัธยม 3"] }
 */
export const getGrades = async () => {
  const response = await apiClient.get('/grades')
  return response.data
}

/**
 * ดึงรายการห้องเรียนทั้งหมดของระดับชั้นที่เลือก
 * GET /api/grades/:gradeName/classrooms
 *
 * @param {string} gradeName  เช่น "ประถม 5"
 * Response: { data: ["ป.5/1", "ป.5/2", "ป.5/3", "ป.5/4", "ป.5/5"] }
 */
export const getClassroomsByGrade = async (gradeName) => {
  const response = await apiClient.get(`/grades/${encodeURIComponent(gradeName)}/classrooms`)
  return response.data
}

/**
 * ดึงข้อมูลครูผู้สอนและวิชาทั้งหมดในระดับชั้นที่เลือก
 * GET /api/grades/:gradeName/teachers
 *
 * @param {string} gradeName  เช่น "ประถม 5"
 * Response:
 * {
 *   teachers: [{ teacherId, teacherName, subjects: [{ subjectName, periodsPerWeek }] }],
 *   subjects: ["คณิตศาสตร์", "ภาษาไทย", ...]
 * }
 */
export const getTeachersByGrade = async (gradeName) => {
  const response = await apiClient.get(`/grades/${encodeURIComponent(gradeName)}/teachers`)
  return response.data
}

/**
 * ดึงตารางเวลาที่จัดแล้วของระดับชั้น (ถ้ามี)
 * GET /api/timetable/:gradeName
 *
 * @param {string} gradeName  เช่น "ประถม 5"
 * Response:
 * {
 *   teacherSchedules: { [teacherId]: { [day]: { [period]: { subject, room } } } },
 *   classSchedules:   { [roomId]:    { [day]: { [period]: { subject, teacher } } } }
 * }
 */
export const getTimetable = async (gradeName) => {
  const response = await apiClient.get(`/timetable/${encodeURIComponent(gradeName)}`)
  return response.data
}

/**
 * ดึงรายละเอียดการมอบหมายสอนของห้องที่เลือก
 * GET /api/assignments/:roomId
 *
 * @param {string} roomId  เช่น "ป.5/1"
 * Response:
 * {
 *   roomId, grade, room,
 *   assignments: [{ teacherId, teacherName, subject, periodsPerWeek }]
 * }
 */
export const getAssignmentsByRoom = async (roomId) => {
  const response = await apiClient.get(`/assignments/${encodeURIComponent(roomId)}`)
  return response.data
}

// ============================================================
//  ตัวอย่าง POST Requests
// ============================================================

/**
 * สั่ง random จัดตารางสอนสำหรับระดับชั้นที่เลือก
 * POST /api/timetable/generate
 *
 * @param {string} gradeName  เช่น "ประถม 5"
 * @param {object} options    ตัวเลือกเพิ่มเติม (ถ้ามี)
 *
 * Request Body:
 * { gradeName: "ประถม 5", options: { seed: null, fixScout: true } }
 *
 * Response:
 * {
 *   success: true,
 *   teacherSchedules: { ... },
 *   classSchedules:   { ... }
 * }
 */
export const generateTimetable = async (gradeName, options = {}) => {
  const response = await apiClient.post('/timetable/generate', {
    gradeName,
    options: {
      fixScout: true,   // ล็อควิชาลูกเสือ วันพุธ คาบ 6 ทุกห้อง
      seed: null,       // null = random ใหม่ทุกครั้ง, ใส่ตัวเลขเพื่อ reproduce ผลลัพธ์
      ...options,
    },
  })
  return response.data
}

/**
 * บันทึกตารางที่ random ได้ลงไปยัง Excel (สำหรับ export)
 * POST /api/timetable/save
 *
 * Request Body:
 * {
 *   gradeName: "ประถม 5",
 *   teacherSchedules: { ... },
 *   classSchedules:   { ... }
 * }
 *
 * Response: { success: true, filePath: "/exports/timetable_ป.5.xlsx" }
 */
export const saveTimetable = async (gradeName, scheduleData) => {
  const response = await apiClient.post('/timetable/save', {
    gradeName,
    ...scheduleData,
  })
  return response.data
}

export default apiClient
