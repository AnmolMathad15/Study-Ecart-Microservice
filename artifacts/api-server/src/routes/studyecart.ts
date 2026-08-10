import { Router, type IRouter, type Request, type Response } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  AttendanceInput,
  CreateAttendanceBody,
  CreateCourseBody,
  CreateDepartmentBody,
  CreateStudentBody,
  GetAttendanceSummaryParams,
  GetCoursesQueryParams,
  GetStudentsQueryParams,
  LoginBody,
  UpdateAttendanceBody,
  UpdateCourseBody,
  UpdateDepartmentBody,
  UpdateStudentBody,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import {
  attendanceTable,
  coursesTable,
  departmentsTable,
  studentsTable,
  usersTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const currentYear = new Date().getFullYear();

type StudentInput = ReturnType<typeof CreateStudentBody.parse>;
type DepartmentInput = ReturnType<typeof CreateDepartmentBody.parse>;
type CourseInput = ReturnType<typeof CreateCourseBody.parse>;
type AttendanceInputType = ReturnType<typeof CreateAttendanceBody.parse>;

let seedPromise: Promise<void> | null = null;

function errorResponse(res: Response, status: number, message: string, errors?: Record<string, string>) {
  return res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
}

function handleError(req: Request, res: Response, error: unknown) {
  const code = (error as { code?: string }).code;
  if (code === "23505") return errorResponse(res, 409, "A record with those unique details already exists.");
  req.log?.error({ err: error }, "StudyEcart request failed");
  return errorResponse(res, 500, "An unexpected server error occurred.");
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function passwordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, salt, storedHash] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !storedHash) return false;
  try {
    const derivedHash = scryptSync(password, salt, 64);
    const expectedHash = Buffer.from(storedHash, "hex");
    return expectedHash.length === derivedHash.length && timingSafeEqual(derivedHash, expectedHash);
  } catch {
    return false;
  }
}

function createToken(user: { id: number; email: string; role: string }): string {
  const secret = process.env.SESSION_SECRET ?? "studyecart-development-session";
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token: string): boolean {
  const secret = process.env.SESSION_SECRET ?? "studyecart-development-session";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof decoded.exp === "number" && decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function dateOnly(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function attendancePercent(records: Array<{ status: string }>): number {
  if (!records.length) return 0;
  const attended = records.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
  return Number(((attended / records.length) * 100).toFixed(1));
}

function toStudent(row: typeof studentsTable.$inferSelect, departments: Map<number, typeof departmentsTable.$inferSelect>, courses: Map<number, typeof coursesTable.$inferSelect>, attendance: Array<{ studentId: number; status: string }>) {
  const department = departments.get(row.departmentId);
  const course = courses.get(row.courseId);
  return {
    id: row.id,
    studentId: row.studentId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    ...(row.address ? { address: row.address } : {}),
    ...(row.city ? { city: row.city } : {}),
    ...(row.state ? { state: row.state } : {}),
    ...(row.pincode ? { pincode: row.pincode } : {}),
    departmentId: row.departmentId,
    departmentName: department?.name ?? "Unknown department",
    courseId: row.courseId,
    courseName: course?.name ?? "Unknown course",
    semester: row.semester,
    admissionYear: row.admissionYear,
    profileImage: row.profileImage,
    status: row.status,
    attendancePercentage: attendancePercent(attendance.filter((record) => record.studentId === row.id)),
    createdAt: row.createdAt,
  };
}

async function allReferenceData() {
  const [departments, courses, attendance] = await Promise.all([
    db.select().from(departmentsTable).orderBy(asc(departmentsTable.name)),
    db.select().from(coursesTable).orderBy(asc(coursesTable.name)),
    db.select({ studentId: attendanceTable.studentId, status: attendanceTable.status }).from(attendanceTable),
  ]);
  return {
    departments: new Map(departments.map((department) => [department.id, department])),
    courses: new Map(courses.map((course) => [course.id, course])),
    attendance,
  };
}

async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await db.select({ id: departmentsTable.id }).from(departmentsTable).limit(1);
      if (existing.length) {
        const existingUsers = await db.select().from(usersTable);
        if (!existingUsers.length) {
          await db.insert(usersTable).values([
            { name: "StudyEcart Admin", email: "admin@studyecart.edu", passwordHash: passwordHash("welcome1"), role: "ADMIN" },
            { name: "StudyEcart Staff", email: "staff@studyecart.edu", passwordHash: passwordHash("welcome1"), role: "STAFF" },
          ]);
        } else {
          for (const user of existingUsers) {
            if (user.passwordHash === "managed-by-auth") {
              await db.update(usersTable).set({ passwordHash: passwordHash("welcome1"), updatedAt: new Date() }).where(eq(usersTable.id, user.id));
            }
          }
        }
        return;
      }

      const departments = await db
        .insert(departmentsTable)
        .values([
          { name: "Computer Science & Engineering", code: "CSE", description: "Computing, software, and systems engineering." },
          { name: "Information Science", code: "ISE", description: "Data, information systems, and digital infrastructure." },
          { name: "Electronics & Communication", code: "ECE", description: "Embedded systems, communication, and electronics." },
          { name: "Business Administration", code: "BBA", description: "Management, entrepreneurship, and business operations." },
        ])
        .returning();

      const courses = await db
        .insert(coursesTable)
        .values([
          { name: "B.Tech Computer Science", code: "BTECH-CSE", duration: 4, departmentId: departments[0].id, description: "Core computer science and engineering program." },
          { name: "B.Tech Information Science", code: "BTECH-ISE", duration: 4, departmentId: departments[1].id, description: "Information systems, software, and data engineering." },
          { name: "B.Tech Electronics", code: "BTECH-ECE", duration: 4, departmentId: departments[2].id, description: "Electronics and communication engineering program." },
          { name: "Bachelor of Business Administration", code: "BBA-GEN", duration: 3, departmentId: departments[3].id, description: "A practical foundation in business and management." },
        ])
        .returning();

      const students = await db
        .insert(studentsTable)
        .values([
          { studentId: "JCET001", firstName: "Anmol", lastName: "Mathad", email: "anmol.mathad@example.com", phone: "9876543210", dateOfBirth: "2004-08-14", gender: "MALE", address: "12 Lake View Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", departmentId: departments[0].id, courseId: courses[0].id, semester: 6, admissionYear: 2022, status: "ACTIVE" },
          { studentId: "JCET002", firstName: "Aarav", lastName: "Sharma", email: "aarav.sharma@example.com", phone: "9876543211", dateOfBirth: "2005-01-21", gender: "MALE", address: "44 Residency Road", city: "Mysuru", state: "Karnataka", pincode: "570001", departmentId: departments[1].id, courseId: courses[1].id, semester: 4, admissionYear: 2023, status: "ACTIVE" },
          { studentId: "JCET003", firstName: "Meera", lastName: "Nair", email: "meera.nair@example.com", phone: "9876543212", dateOfBirth: "2003-11-03", gender: "FEMALE", address: "7 Temple Street", city: "Mangaluru", state: "Karnataka", pincode: "575001", departmentId: departments[2].id, courseId: courses[2].id, semester: 8, admissionYear: 2021, status: "ACTIVE" },
          { studentId: "JCET004", firstName: "Riya", lastName: "Patil", email: "riya.patil@example.com", phone: "9876543213", dateOfBirth: "2004-05-19", gender: "FEMALE", address: "19 Green Park", city: "Hubballi", state: "Karnataka", pincode: "580001", departmentId: departments[3].id, courseId: courses[3].id, semester: 6, admissionYear: 2022, status: "INACTIVE" },
          { studentId: "JCET005", firstName: "Dev", lastName: "Kulkarni", email: "dev.kulkarni@example.com", phone: "9876543214", dateOfBirth: "2002-02-28", gender: "MALE", address: "3 College Road", city: "Belagavi", state: "Karnataka", pincode: "590001", departmentId: departments[0].id, courseId: courses[0].id, semester: 8, admissionYear: 2020, status: "GRADUATED" },
        ])
        .returning();

      await db.insert(attendanceTable).values([
        { studentId: students[0].id, date: "2026-06-01", status: "PRESENT" },
        { studentId: students[0].id, date: "2026-06-02", status: "PRESENT" },
        { studentId: students[0].id, date: "2026-06-03", status: "LATE" },
        { studentId: students[0].id, date: "2026-06-04", status: "ABSENT" },
        { studentId: students[1].id, date: "2026-06-01", status: "PRESENT" },
        { studentId: students[1].id, date: "2026-06-02", status: "PRESENT" },
        { studentId: students[1].id, date: "2026-06-03", status: "PRESENT" },
        { studentId: students[2].id, date: "2026-06-01", status: "PRESENT" },
        { studentId: students[2].id, date: "2026-06-02", status: "LEAVE" },
      ]);

      await db.insert(usersTable).values([
        { name: "StudyEcart Admin", email: "admin@studyecart.edu", passwordHash: passwordHash("welcome1"), role: "ADMIN" },
        { name: "StudyEcart Staff", email: "staff@studyecart.edu", passwordHash: passwordHash("welcome1"), role: "STAFF" },
      ]);
      logger.info("Seeded StudyEcart development records");
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  await seedPromise;
}

router.use(async (_req, _res, next) => {
  try {
    await ensureSeeded();
    next();
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", { email: "Enter a valid email address.", password: "Password must be at least 6 characters." });
  try {
    const user = (await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email)).limit(1))[0];
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) return errorResponse(res, 401, "Invalid email or password.");
    const token = createToken(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.use((req, res, next) => {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || !verifyToken(token)) {
    errorResponse(res, 401, "Authentication required.");
    return;
  }
  return next();
});

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [[{ totalStudents }], [{ activeStudents }], [{ totalDepartments }], [{ totalCourses }], students, refs] = await Promise.all([
      db.select({ totalStudents: count() }).from(studentsTable),
      db.select({ activeStudents: count() }).from(studentsTable).where(eq(studentsTable.status, "ACTIVE")),
      db.select({ totalDepartments: count() }).from(departmentsTable),
      db.select({ totalCourses: count() }).from(coursesTable),
      db.select().from(studentsTable).orderBy(desc(studentsTable.createdAt)),
      allReferenceData(),
    ]);
    const yearStart = `${currentYear}-01-01`;
    const newStudents = students.filter((student) => student.createdAt >= new Date(`${yearStart}T00:00:00Z`)).length;
    const attendanceValues = refs.attendance;
    const activeAttendance = students.filter((student) => student.status === "ACTIVE").flatMap((student) => attendanceValues.filter((row) => row.studentId === student.id));
    const distribution = Array.from(refs.departments.values()).map((department) => {
      const number = students.filter((student) => student.departmentId === department.id).length;
      return { name: department.name, count: number, percentage: students.length ? Number(((number / students.length) * 100).toFixed(1)) : 0 };
    }).filter((item) => item.count > 0);
    return res.json({
      totalStudents: asNumber(totalStudents),
      activeStudents: asNumber(activeStudents),
      newStudents,
      totalDepartments: asNumber(totalDepartments),
      totalCourses: asNumber(totalCourses),
      averageAttendance: attendancePercent(activeAttendance),
      recentStudents: students.slice(0, 5).map((student) => toStudent(student, refs.departments, refs.courses, refs.attendance)),
      departmentDistribution: distribution,
    });
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.get("/students", async (req, res) => {
  const parsed = GetStudentsQueryParams.safeParse(req.query);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", { query: "Use valid pagination and filter values." });
  try {
    const { page, size, search, departmentId, courseId, semester, status } = parsed.data;
    const filters = [
      search ? or(ilike(studentsTable.firstName, `%${search}%`), ilike(studentsTable.lastName, `%${search}%`), ilike(studentsTable.studentId, `%${search}%`), ilike(studentsTable.email, `%${search}%`)) : undefined,
      departmentId ? eq(studentsTable.departmentId, departmentId) : undefined,
      courseId ? eq(studentsTable.courseId, courseId) : undefined,
      semester ? eq(studentsTable.semester, semester) : undefined,
      status ? eq(studentsTable.status, status) : undefined,
    ].filter(Boolean);
    const where = filters.length ? and(...filters) : undefined;
    const [students, [{ total }], refs] = await Promise.all([
      db.select().from(studentsTable).where(where).orderBy(asc(studentsTable.lastName), asc(studentsTable.firstName)).limit(size).offset(page * size),
      db.select({ total: count() }).from(studentsTable).where(where),
      allReferenceData(),
    ]);
    const totalItems = asNumber(total);
    return res.json({ items: students.map((student) => toStudent(student, refs.departments, refs.courses, refs.attendance)), page, size, totalItems, totalPages: Math.ceil(totalItems / size) });
  } catch (error) {
    return handleError(req, res, error);
  }
});

async function getStudentOrNull(id: number) {
  return (await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1))[0];
}

async function validateStudentReferences(input: StudentInput) {
  const department = (await db.select().from(departmentsTable).where(eq(departmentsTable.id, input.departmentId)).limit(1))[0];
  const course = (await db.select().from(coursesTable).where(eq(coursesTable.id, input.courseId)).limit(1))[0];
  if (!department) return "Selected department does not exist.";
  if (!course) return "Selected course does not exist.";
  if (course.departmentId !== department.id) return "Selected course does not belong to the selected department.";
  if (new Date(input.dateOfBirth) > new Date()) return "Date of birth cannot be in the future.";
  return null;
}

router.post("/students", async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  try {
    const referenceError = await validateStudentReferences(parsed.data);
    if (referenceError) return errorResponse(res, 400, referenceError);
    const row = (await db.insert(studentsTable).values({ ...parsed.data, dateOfBirth: dateOnly(parsed.data.dateOfBirth) }).returning())[0];
    const refs = await allReferenceData();
    return res.status(201).json(toStudent(row, refs.departments, refs.courses, refs.attendance));
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.get("/students/:id", async (req, res) => {
  try {
    const row = await getStudentOrNull(Number(req.params.id));
    if (!row) return errorResponse(res, 404, "Student not found.");
    const refs = await allReferenceData();
    return res.json(toStudent(row, refs.departments, refs.courses, refs.attendance));
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.put("/students/:id", async (req, res) => {
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  try {
    const id = Number(req.params.id);
    if (!(await getStudentOrNull(id))) return errorResponse(res, 404, "Student not found.");
    const referenceError = await validateStudentReferences(parsed.data);
    if (referenceError) return errorResponse(res, 400, referenceError);
    const row = (await db.update(studentsTable).set({ ...parsed.data, dateOfBirth: dateOnly(parsed.data.dateOfBirth), updatedAt: new Date() }).where(eq(studentsTable.id, id)).returning())[0];
    const refs = await allReferenceData();
    return res.json(toStudent(row, refs.departments, refs.courses, refs.attendance));
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.delete("/students/:id", async (req, res) => {
  try {
    if (!(await getStudentOrNull(Number(req.params.id)))) return errorResponse(res, 404, "Student not found.");
    await db.delete(studentsTable).where(eq(studentsTable.id, Number(req.params.id)));
    return res.status(204).send();
  } catch (error) {
    return handleError(req, res, error);
  }
});

async function departmentDto(row: typeof departmentsTable.$inferSelect) {
  const [studentCount, courseCount] = await Promise.all([
    db.select({ value: count() }).from(studentsTable).where(eq(studentsTable.departmentId, row.id)),
    db.select({ value: count() }).from(coursesTable).where(eq(coursesTable.departmentId, row.id)),
  ]);
  return { ...row, description: row.description ?? "", studentCount: asNumber(studentCount[0]?.value), courseCount: asNumber(courseCount[0]?.value) };
}

router.get("/departments", async (req, res) => {
  try {
    const rows = await db.select().from(departmentsTable).orderBy(asc(departmentsTable.name));
    return res.json(await Promise.all(rows.map(departmentDto)));
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.post("/departments", async (req, res) => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  try {
    const row = (await db.insert(departmentsTable).values(parsed.data as DepartmentInput).returning())[0];
    return res.status(201).json(await departmentDto(row));
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.get("/departments/:id", async (req, res) => {
  try {
    const row = (await db.select().from(departmentsTable).where(eq(departmentsTable.id, Number(req.params.id))).limit(1))[0];
    return row ? res.json(await departmentDto(row)) : errorResponse(res, 404, "Department not found.");
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.put("/departments/:id", async (req, res) => {
  const parsed = UpdateDepartmentBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  try {
    const row = (await db.update(departmentsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(departmentsTable.id, Number(req.params.id))).returning())[0];
    return row ? res.json(await departmentDto(row)) : errorResponse(res, 404, "Department not found.");
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.delete("/departments/:id", async (req, res) => {
  try {
    const linked = await db.select({ id: studentsTable.id }).from(studentsTable).where(eq(studentsTable.departmentId, Number(req.params.id))).limit(1);
    if (linked.length) return errorResponse(res, 409, "Department cannot be deleted while students are assigned to it.");
    const deleted = await db.delete(departmentsTable).where(eq(departmentsTable.id, Number(req.params.id))).returning({ id: departmentsTable.id });
    return deleted.length ? res.status(204).send() : errorResponse(res, 404, "Department not found.");
  } catch (error) {
    return handleError(req, res, error);
  }
});

async function courseDto(row: typeof coursesTable.$inferSelect) {
  const [department, [{ studentCount }]] = await Promise.all([
    db.select().from(departmentsTable).where(eq(departmentsTable.id, row.departmentId)).limit(1),
    db.select({ studentCount: count() }).from(studentsTable).where(eq(studentsTable.courseId, row.id)),
  ]);
  return { ...row, description: row.description ?? "", departmentName: department[0]?.name ?? "Unknown department", studentCount: asNumber(studentCount) };
}

router.get("/courses", async (req, res) => {
  const parsed = GetCoursesQueryParams.safeParse(req.query);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed");
  try {
    const rows = await db.select().from(coursesTable).where(parsed.data.departmentId ? eq(coursesTable.departmentId, parsed.data.departmentId) : undefined).orderBy(asc(coursesTable.name));
    return res.json(await Promise.all(rows.map(courseDto)));
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.post("/courses", async (req, res) => {
  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  try {
    const department = await db.select({ id: departmentsTable.id }).from(departmentsTable).where(eq(departmentsTable.id, parsed.data.departmentId)).limit(1);
    if (!department.length) return errorResponse(res, 400, "Selected department does not exist.");
    const row = (await db.insert(coursesTable).values(parsed.data as CourseInput).returning())[0];
    return res.status(201).json(await courseDto(row));
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.get("/courses/:id", async (req, res) => {
  try {
    const row = (await db.select().from(coursesTable).where(eq(coursesTable.id, Number(req.params.id))).limit(1))[0];
    return row ? res.json(await courseDto(row)) : errorResponse(res, 404, "Course not found.");
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.put("/courses/:id", async (req, res) => {
  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  try {
    const department = await db.select({ id: departmentsTable.id }).from(departmentsTable).where(eq(departmentsTable.id, parsed.data.departmentId)).limit(1);
    if (!department.length) return errorResponse(res, 400, "Selected department does not exist.");
    const row = (await db.update(coursesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(coursesTable.id, Number(req.params.id))).returning())[0];
    return row ? res.json(await courseDto(row)) : errorResponse(res, 404, "Course not found.");
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.delete("/courses/:id", async (req, res) => {
  try {
    const linked = await db.select({ id: studentsTable.id }).from(studentsTable).where(eq(studentsTable.courseId, Number(req.params.id))).limit(1);
    if (linked.length) return errorResponse(res, 409, "Course cannot be deleted while students are enrolled.");
    const deleted = await db.delete(coursesTable).where(eq(coursesTable.id, Number(req.params.id))).returning({ id: coursesTable.id });
    return deleted.length ? res.status(204).send() : errorResponse(res, 404, "Course not found.");
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.get("/attendance/student/:studentId", async (req, res) => {
  try {
    const student = await getStudentOrNull(Number(req.params.studentId));
    if (!student) return errorResponse(res, 404, "Student not found.");
    return res.json(await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, student.id)).orderBy(desc(attendanceTable.date)));
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.get("/attendance/student/:studentId/summary", async (req, res) => {
  const parsed = GetAttendanceSummaryParams.safeParse({ studentId: req.params.studentId });
  if (!parsed.success) return errorResponse(res, 400, "Invalid student id.");
  try {
    if (!(await getStudentOrNull(parsed.data.studentId))) return errorResponse(res, 404, "Student not found.");
    const records = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, parsed.data.studentId));
    const present = records.filter((record) => record.status === "PRESENT").length;
    const absent = records.filter((record) => record.status === "ABSENT").length;
    const late = records.filter((record) => record.status === "LATE").length;
    const leave = records.filter((record) => record.status === "LEAVE").length;
    return res.json({ totalClasses: records.length, present, absent, late, leave, attendancePercentage: attendancePercent(records) });
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.post("/attendance", async (req, res) => {
  const parsed = CreateAttendanceBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  try {
    if (!(await getStudentOrNull(parsed.data.studentId))) return errorResponse(res, 404, "Student not found.");
    const row = (await db.insert(attendanceTable).values({ ...parsed.data, date: dateOnly(parsed.data.date) }).returning())[0];
    return res.status(201).json(row);
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.put("/attendance/:id", async (req, res) => {
  const parsed = UpdateAttendanceBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "Validation failed", Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  try {
    const row = (await db.update(attendanceTable).set({ ...parsed.data, date: dateOnly(parsed.data.date), updatedAt: new Date() }).where(eq(attendanceTable.id, Number(req.params.id))).returning())[0];
    return row ? res.json(row) : errorResponse(res, 404, "Attendance record not found.");
  } catch (error) {
    return handleError(req, res, error);
  }
});

router.delete("/attendance/:id", async (req, res) => {
  try {
    const deleted = await db.delete(attendanceTable).where(eq(attendanceTable.id, Number(req.params.id))).returning({ id: attendanceTable.id });
    return deleted.length ? res.status(204).send() : errorResponse(res, 404, "Attendance record not found.");
  } catch (error) {
    return handleError(req, res, error);
  }
});

export default router;