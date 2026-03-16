# งานที่ต้องทำต่อ: ระบบจัดการกะทำงาน

## ปัญหาปัจจุบัน:
- TypeScript error: `workStartTimes` type ไม่ตรงกัน
- ปัจจุบัน: `workStartTimes: string[]`  
- ต้องการ: `workStartTimes: Array<{name: string, startTime: string, endTime: string}>`

## ขั้นตอนที่ต้องทำ:

### 1. แก้ไข types.ts
- เพิ่ม interface `WorkShift`:
```typescript
export interface WorkShift {
  name: string;
  startTime: string;
  endTime: string;
}
```

- แก้ `SystemSettings` interface:
```typescript
export interface SystemSettings {
  lateThresholdMinute: number;
  officeLocations: GeoLocation[];
  workStartTimes: WorkShift[];  // เปลี่ยนจาก string[]
  availableRoles: string[];
}
```

### 2. แก้ไข History.tsx - checkIfLate function
- ปรับให้ใช้ `shift.startTime` แทน `startTime` โดยตรง
- Loop ผ่าน `settings.workStartTimes` และเข้าถึง `.startTime`

### 3. แก้ไข AdminConsole.tsx - UI สำหรับแสดงกะ
- เปลี่ยนจาก:
```tsx
{(settings.workStartTimes || []).map((time, idx) => ...)}
```

- เป็น:
```tsx
{(settings.workStartTimes || []).map((shift, idx) => (
  <div key={idx}>
    <p>{shift.name}</p>
    <p>เวลาเข้างาน: {shift.startTime}</p>
    <p>เวลาเลิกงาน: {shift.endTime}</p>
  </div>
))}
```

### 4. เพิ่ม Popup Modal สำหรับเพิ่ม/แก้ไขกะ
- สร้าง modal component คล้ายกับ Add Location
- ฟอร์มมี 3 fields:
  - ชื่อกะ (text input)
  - เวลาเข้างาน (time input)
  - เวลาเลิกงาน (time input)

### 5. แก้ไข button "เพิ่มกะ"
- เปลี่ยนจาก `prompt()` เป็น `setShowAddShift(true)`
- แสดง modal แทน

### 6. Deploy
- Build และ deploy ไป Vercel

## ไฟล์ที่ต้องแก้ไข:
1. ✅ App.tsx - DEFAULT_SETTINGS (แก้แล้ว)
2. ⏳ types.ts - เพิ่ม WorkShift interface
3. ⏳ components/History.tsx - แก้ checkIfLate function
4. ⏳ components/AdminConsole.tsx - แก้ UI และเพิ่ม modal

